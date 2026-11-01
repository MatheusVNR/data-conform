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
}
