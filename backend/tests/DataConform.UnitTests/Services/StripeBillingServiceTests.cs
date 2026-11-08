using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Services;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class StripeBillingServiceTests
{
    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(_responder(request));
        }
    }

    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    private static string CreateStripeSignatureHeader(string payload, string secret, long timestamp)
    {
        string signedPayload = $"{timestamp}.{payload}";
        byte[] hash = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(signedPayload));

        string hexSignature = Convert.ToHexString(hash).ToLowerInvariant();
        return $"t={timestamp},v1={hexSignature}";
    }

    [Fact]
    public async Task VerifyCheckoutSessionAsync_InProductionWithoutSecretKey_ShouldFailClosed()
    {
        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "ASPNETCORE_ENVIRONMENT", "Production" }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        StripeBillingService service = new StripeBillingService(httpClient, configuration);

        StripeSessionVerificationResult result = await service.VerifyCheckoutSessionAsync(
            "cs_live_a1b2c3d4e5f6g7h8i9j0",
            PlanTier.Professional);

        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyCheckoutSessionAsync_WithStripeApiPaidSession_ShouldPreventTierEscalationAndReturnIds()
    {
        Guid workspaceId = Guid.NewGuid();
        string jsonResponse = $$"""
        {
          "id": "cs_live_real_session_123456",
          "object": "checkout.session",
          "status": "complete",
          "payment_status": "paid",
          "customer": "cus_test123",
          "subscription": "sub_test456",
          "client_reference_id": "{{workspaceId}}",
          "amount_total": 7990
        }
        """;

        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "Stripe:SecretKey", "sk_test_mock_secret" },
            { "ASPNETCORE_ENVIRONMENT", "Production" }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
        }));

        StripeBillingService service = new StripeBillingService(httpClient, configuration);

        // Simula tentativa maliciosa de enviar Plan = Enterprise tendo pago R$ 79,90 (7990 centavos)
        StripeSessionVerificationResult result = await service.VerifyCheckoutSessionAsync(
            "cs_live_real_session_123456",
            PlanTier.Enterprise);

        Assert.True(result.IsValid);
        Assert.Equal(PlanTier.Professional, result.VerifiedPlan);
        Assert.Equal("cus_test123", result.CustomerId);
        Assert.Equal("sub_test456", result.SubscriptionId);
        Assert.Equal(workspaceId, result.ClientReferenceWorkspaceId);
    }

    [Fact]
    public async Task HandleStripeWebhookAsync_ShouldUpgradeOnCheckoutCompletedAndDowngradeOnSubscriptionDeleted()
    {
        const string webhookSecret = "whsec_unit_test_secret_2026";
        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "Stripe:SecretKey", "sk_test_mock_secret" },
            { "Stripe:WebhookSecret", webhookSecret }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        bool cancelRequestSent = false;
        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(req =>
        {
            if (req.Method == HttpMethod.Delete || req.Method == HttpMethod.Post)
            {
                cancelRequestSent = true;
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"id\":\"sub_999\",\"status\":\"canceled\"}", Encoding.UTF8, "application/json")
            };
        }));

        StripeBillingService stripeBilling = new StripeBillingService(httpClient, configuration);

        using DataConformDbContext dbContext = CreateInMemoryContext();
        TenantAccessService tenantAccess = new TenantAccessService(dbContext);
        SubscriptionQuotaService quotaService = new SubscriptionQuotaService(dbContext);
        AuditService auditService = new AuditService(dbContext, tenantAccess);
        WorkspaceService workspaceService = new WorkspaceService(
            dbContext,
            quotaService,
            auditService,
            tenantAccess,
            stripeBilling);

        Guid ownerId = Guid.NewGuid();
        ServiceResult<WorkspaceDto> createdWs = await workspaceService.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Webhook Corp", Slug = "webhook-corp" },
            ownerId);
        Assert.NotNull(createdWs.Data);
        Guid workspaceId = createdWs.Data.Id;

        long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        string completedPayload = $$"""
        {
          "id": "evt_checkout_001",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "cs_live_webhook_00123456789",
              "object": "checkout.session",
              "client_reference_id": "{{workspaceId}}",
              "customer": "cus_webhook_1",
              "subscription": "sub_webhook_1",
              "amount_total": 7990
            }
          }
        }
        """;

        string validSignature = CreateStripeSignatureHeader(completedPayload, webhookSecret, nowUnix);
        ServiceResult webhookUpgradeResult = await workspaceService.HandleStripeWebhookAsync(completedPayload, validSignature);

        Assert.True(webhookUpgradeResult.IsSuccess);

        Workspace? upgradedWs = await dbContext.Workspaces.FirstAsync(w => w.Id == workspaceId);
        Assert.Equal(PlanTier.Professional, upgradedWs.Plan);
        Assert.Equal(500, upgradedWs.MonthlyFilesQuota);
        Assert.Equal("sub_webhook_1", upgradedWs.StripeSubscriptionId);

        // Testar cancelamento voluntário acionando DELETE na API da Stripe
        ServiceResult<WorkspaceQuotaDto> cancelResult = await workspaceService.ChangeWorkspacePlanAsync(
            workspaceId,
            new UpdatePlanRequest { Plan = PlanTier.Starter, Reason = "Teste cancelamento real" },
            ownerId,
            workspaceId);

        Assert.True(cancelResult.IsSuccess);
        Assert.True(cancelRequestSent);
        Assert.Equal(PlanTier.Starter, cancelResult.Data?.Plan);

        // Testar rejeição de assinatura inválida no Webhook
        ServiceResult tamperedResult = await workspaceService.HandleStripeWebhookAsync(completedPayload, "t=12345,v1=deadbeef");
        Assert.False(tamperedResult.IsSuccess);
    }

    [Fact]
    public async Task HandleStripeWebhookAsync_ConcurrentDuplicateDeliveries_ShouldBeIdempotent()
    {
        const string webhookSecret = "whsec_unit_test_secret_concurrency";
        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "Stripe:SecretKey", "sk_test_mock_secret" },
            { "Stripe:WebhookSecret", webhookSecret }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        StripeBillingService stripeBilling = new StripeBillingService(httpClient, configuration);

        using DataConformDbContext dbContext = CreateInMemoryContext();
        TenantAccessService tenantAccess = new TenantAccessService(dbContext);
        SubscriptionQuotaService quotaService = new SubscriptionQuotaService(dbContext);
        AuditService auditService = new AuditService(dbContext, tenantAccess);
        WorkspaceService workspaceService = new WorkspaceService(
            dbContext,
            quotaService,
            auditService,
            tenantAccess,
            stripeBilling);

        Guid ownerId = Guid.NewGuid();
        ServiceResult<WorkspaceDto> createdWs = await workspaceService.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Concurrent Corp", Slug = "concurrent-corp" },
            ownerId);
        Guid workspaceId = createdWs.Data!.Id;

        long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        string completedPayload = $$"""
        {
          "id": "evt_concurrent_999",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "cs_concurrent_123",
              "object": "checkout.session",
              "client_reference_id": "{{workspaceId}}",
              "customer": "cus_concurrent_1",
              "subscription": "sub_concurrent_1",
              "amount_total": 7990
            }
          }
        }
        """;

        string validSignature = CreateStripeSignatureHeader(completedPayload, webhookSecret, nowUnix);

        // Disparar duas entregas concorrentes simultâneas do mesmo evento
        Task<ServiceResult> task1 = Task.Run(() => workspaceService.HandleStripeWebhookAsync(completedPayload, validSignature));
        Task<ServiceResult> task2 = Task.Run(() => workspaceService.HandleStripeWebhookAsync(completedPayload, validSignature));

        ServiceResult[] results = await Task.WhenAll(task1, task2);
        Assert.All(results, r => Assert.True(r.IsSuccess));

        Workspace? ws = await dbContext.Workspaces.FirstAsync(w => w.Id == workspaceId);
        Assert.Equal(PlanTier.Professional, ws.Plan);
        Assert.Equal("sub_concurrent_1", ws.StripeSubscriptionId);

        int processedAuditCount = await dbContext.AuditLogs
            .CountAsync(a => a.Action == "StripeWebhookProcessed" && a.EntityId == "evt_concurrent_999");
        Assert.Equal(1, processedAuditCount);
    }

    [Fact]
    public async Task CreateCheckoutSessionAsync_ShouldIncludeBrazilFiscalFieldsAndSanitizeUntrustedRedirectHost()
    {
        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "Stripe:SecretKey", "sk_test_mock_secret" },
            { "Stripe:ProPriceId", "price_pro_brl_7990" }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        string? capturedFormBody = null;
        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(req =>
        {
            capturedFormBody = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"id\":\"cs_test_1234567890abcdef\",\"url\":\"https://checkout.stripe.com/c/pay/cs_test_1234567890abcdef\"}",
                    Encoding.UTF8,
                    "application/json")
            };
        }));

        StripeBillingService stripeBilling = new StripeBillingService(httpClient, configuration);

        using DataConformDbContext dbContext = CreateInMemoryContext();
        TenantAccessService tenantAccess = new TenantAccessService(dbContext);
        SubscriptionQuotaService quotaService = new SubscriptionQuotaService(dbContext);
        AuditService auditService = new AuditService(dbContext, tenantAccess);
        WorkspaceService workspaceService = new WorkspaceService(
            dbContext,
            quotaService,
            auditService,
            tenantAccess,
            stripeBilling);

        Guid ownerId = Guid.NewGuid();
        ServiceResult<WorkspaceDto> createdWs = await workspaceService.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Checkout Fiscal", Slug = "checkout-fiscal" },
            ownerId);
        Guid workspaceId = createdWs.Data!.Id;

        ServiceResult<CheckoutSessionResponseDto> sessionResult = await workspaceService.CreateCheckoutSessionAsync(
            workspaceId,
            new CreateCheckoutSessionRequest
            {
                Plan = PlanTier.Professional,
                SuccessUrl = "https://evil-phishing.example.com/steal",
                CancelUrl = "https://evil-phishing.example.com/cancel"
            },
            ownerId,
            workspaceId,
            "financeiro@empresa.com.br",
            "https://dataconform.com.br");

        Assert.True(sessionResult.IsSuccess);
        Assert.NotNull(capturedFormBody);
        string decodedForm = Uri.UnescapeDataString(capturedFormBody);
        Assert.Contains("tax_id_collection[enabled]=true", decodedForm);
        Assert.Contains("billing_address_collection=required", decodedForm);
        Assert.Contains("allow_promotion_codes=true", decodedForm);
        Assert.Contains("line_items[0][price]=price_pro_brl_7990", decodedForm);
        Assert.DoesNotContain("evil-phishing.example.com", decodedForm);
        Assert.Contains("https://dataconform.com.br/", decodedForm);
    }

    [Fact]
    public async Task HandleStripeWebhookAsync_FullSubscriptionLifecycle_CancelAtPeriodEndRenewalPastDueAndRefund()
    {
        const string webhookSecret = "whsec_lifecycle_2026";
        Dictionary<string, string?> configMap = new Dictionary<string, string?>
        {
            { "Stripe:SecretKey", "sk_test_mock_secret" },
            { "Stripe:WebhookSecret", webhookSecret },
            { "Stripe:ProPriceId", "price_pro_7990" }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configMap)
            .Build();

        using HttpClient httpClient = new HttpClient(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        StripeBillingService stripeBilling = new StripeBillingService(httpClient, configuration);

        using DataConformDbContext dbContext = CreateInMemoryContext();
        TenantAccessService tenantAccess = new TenantAccessService(dbContext);
        SubscriptionQuotaService quotaService = new SubscriptionQuotaService(dbContext);
        AuditService auditService = new AuditService(dbContext, tenantAccess);
        WorkspaceService workspaceService = new WorkspaceService(
            dbContext,
            quotaService,
            auditService,
            tenantAccess,
            stripeBilling);

        Guid ownerId = Guid.NewGuid();
        ServiceResult<WorkspaceDto> createdWs = await workspaceService.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Lifecycle Org", Slug = "lifecycle-org" },
            ownerId);
        Guid workspaceId = createdWs.Data!.Id;

        Workspace ws = await dbContext.Workspaces.FirstAsync(w => w.Id == workspaceId);
        ws.Plan = PlanTier.Professional;
        ws.MonthlyFilesQuota = 500;
        ws.MaxRowsPerFile = 15_000;
        ws.MonthlyFilesUploaded = 42;
        ws.StripeCustomerId = "cus_life_1";
        ws.StripeSubscriptionId = "sub_life_1";
        await dbContext.SaveChangesAsync();

        long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        long futurePeriodEnd = DateTimeOffset.UtcNow.AddDays(20).ToUnixTimeSeconds();

        // 1. customer.subscription.updated com cancel_at_period_end = true mantém plano Professional ativo até o fim do período
        string subCancelScheduledPayload = $$"""
        {
          "id": "evt_life_1",
          "type": "customer.subscription.updated",
          "data": {
            "object": {
              "id": "sub_life_1",
              "customer": "cus_life_1",
              "status": "active",
              "cancel_at_period_end": true,
              "current_period_end": {{futurePeriodEnd}},
              "metadata": { "workspace_id": "{{workspaceId}}", "plan": "Professional" }
            }
          }
        }
        """;
        ServiceResult r1 = await workspaceService.HandleStripeWebhookAsync(
            subCancelScheduledPayload,
            CreateStripeSignatureHeader(subCancelScheduledPayload, webhookSecret, nowUnix));
        Assert.True(r1.IsSuccess);
        Assert.Equal(PlanTier.Professional, ws.Plan);
        Assert.True(ws.CancelAtPeriodEnd);
        Assert.NotNull(ws.PlanExpiresAtUtc);

        // 2. invoice.payment_succeeded em renovação zera MonthlyFilesUploaded
        string invoicePaidPayload = $$"""
        {
          "id": "evt_life_2",
          "type": "invoice.payment_succeeded",
          "data": {
            "object": {
              "id": "in_life_1",
              "customer": "cus_life_1",
              "subscription": "sub_life_1",
              "billing_reason": "subscription_cycle",
              "amount_paid": 7990
            }
          }
        }
        """;
        ServiceResult r2 = await workspaceService.HandleStripeWebhookAsync(
            invoicePaidPayload,
            CreateStripeSignatureHeader(invoicePaidPayload, webhookSecret, nowUnix));
        Assert.True(r2.IsSuccess);
        Assert.Equal(0, ws.MonthlyFilesUploaded);
        Assert.Equal(PlanTier.Professional, ws.Plan);

        // 3. charge.refunded integral faz downgrade para Starter
        string fullRefundPayload = $$"""
        {
          "id": "evt_life_3",
          "type": "charge.refunded",
          "data": {
            "object": {
              "id": "ch_life_1",
              "customer": "cus_life_1",
              "amount": 7990,
              "amount_refunded": 7990,
              "refunded": true
            }
          }
        }
        """;
        ServiceResult r3 = await workspaceService.HandleStripeWebhookAsync(
            fullRefundPayload,
            CreateStripeSignatureHeader(fullRefundPayload, webhookSecret, nowUnix));
        Assert.True(r3.IsSuccess);
        Assert.Equal(PlanTier.Starter, ws.Plan);
        Assert.Equal(5, ws.MonthlyFilesQuota);
    }
}
