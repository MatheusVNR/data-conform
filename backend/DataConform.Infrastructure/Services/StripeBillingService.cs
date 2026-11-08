using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Enums;

namespace DataConform.Infrastructure.Services;

public class StripeBillingService : IStripeBillingService
{
    private const string StripeApiBaseUrl = "https://api.stripe.com/v1";
    private const long WebhookReplayToleranceSeconds = 300;
    private const long EnterpriseMinimumAmountCents = 20000;

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public StripeBillingService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public BillingConfigDto GetBillingConfig()
    {
        string? secretKey = GetStripeSecretKey();
        string? proPriceId = GetPriceIdForPlan(PlanTier.Professional);
        string? entPriceId = GetPriceIdForPlan(PlanTier.Enterprise);
        string? proLink = GetPaymentLinkForPlan(PlanTier.Professional);
        string? entLink = GetPaymentLinkForPlan(PlanTier.Enterprise);
        bool isProduction = IsProductionEnvironment();

        bool hasApiCheckout = !string.IsNullOrWhiteSpace(secretKey) &&
            (!string.IsNullOrWhiteSpace(proPriceId) || !string.IsNullOrWhiteSpace(entPriceId));

        bool hasValidProLink = !string.IsNullOrWhiteSpace(proLink) &&
            (!isProduction || !proLink.Contains("/test_", StringComparison.OrdinalIgnoreCase));
        bool hasValidEntLink = !string.IsNullOrWhiteSpace(entLink) &&
            (!isProduction || !entLink.Contains("/test_", StringComparison.OrdinalIgnoreCase));

        string? supportEmail = GetConfiguredValue("Support:Email", "SUPPORT_EMAIL");

        return new BillingConfigDto
        {
            CheckoutEnabled = hasApiCheckout || hasValidProLink || hasValidEntLink,
            CustomerPortalEnabled = !string.IsNullOrWhiteSpace(secretKey),
            IsLiveMode = !string.IsNullOrWhiteSpace(secretKey) &&
                secretKey.StartsWith("sk_live_", StringComparison.OrdinalIgnoreCase),
            SupportEmail = supportEmail
        };
    }

    public async Task<StripeCheckoutSessionCreateResult> CreateCheckoutSessionAsync(
        Guid workspaceId,
        string? customerEmail,
        string? existingCustomerId,
        PlanTier plan,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default)
    {
        if (plan == PlanTier.Starter)
        {
            return new StripeCheckoutSessionCreateResult
            {
                IsSuccess = false,
                ErrorMessage = "O plano Starter é gratuito e não requer checkout de pagamento."
            };
        }

        string? secretKey = GetStripeSecretKey();
        string? priceId = GetPriceIdForPlan(plan);
        bool isProduction = IsProductionEnvironment();

        if (!string.IsNullOrWhiteSpace(secretKey) && !string.IsNullOrWhiteSpace(priceId))
        {
            string normalizedSuccessUrl = EnsureSessionIdPlaceholder(successUrl);
            List<KeyValuePair<string, string>> formFields = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("mode", "subscription"),
                new KeyValuePair<string, string>("client_reference_id", workspaceId.ToString()),
                new KeyValuePair<string, string>("success_url", normalizedSuccessUrl),
                new KeyValuePair<string, string>("cancel_url", cancelUrl),
                new KeyValuePair<string, string>("line_items[0][price]", priceId),
                new KeyValuePair<string, string>("line_items[0][quantity]", "1"),
                new KeyValuePair<string, string>("allow_promotion_codes", "true"),
                new KeyValuePair<string, string>("billing_address_collection", "required"),
                new KeyValuePair<string, string>("tax_id_collection[enabled]", "true"),
                new KeyValuePair<string, string>("metadata[workspace_id]", workspaceId.ToString()),
                new KeyValuePair<string, string>("metadata[plan]", plan.ToString()),
                new KeyValuePair<string, string>("subscription_data[metadata][workspace_id]", workspaceId.ToString()),
                new KeyValuePair<string, string>("subscription_data[metadata][plan]", plan.ToString())
            };

            if (!string.IsNullOrWhiteSpace(existingCustomerId))
            {
                formFields.Add(new KeyValuePair<string, string>("customer", existingCustomerId.Trim()));
                formFields.Add(new KeyValuePair<string, string>("customer_update[name]", "auto"));
                formFields.Add(new KeyValuePair<string, string>("customer_update[address]", "auto"));
            }
            else if (!string.IsNullOrWhiteSpace(customerEmail))
            {
                formFields.Add(new KeyValuePair<string, string>("customer_email", customerEmail.Trim()));
            }

            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{StripeApiBaseUrl}/checkout/sessions")
            {
                Content = new FormUrlEncodedContent(formFields)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
            string jsonBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return new StripeCheckoutSessionCreateResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Não foi possível iniciar a sessão de pagamento na Stripe neste momento. Tente novamente em instantes."
                };
            }

            using JsonDocument doc = JsonDocument.Parse(jsonBody);
            JsonElement root = doc.RootElement;
            string? sessionUrl = GetJsonString(root, "url");
            string? sessionId = GetJsonString(root, "id");

            if (string.IsNullOrWhiteSpace(sessionUrl))
            {
                return new StripeCheckoutSessionCreateResult
                {
                    IsSuccess = false,
                    ErrorMessage = "A API da Stripe não retornou a URL de redirecionamento do Checkout."
                };
            }

            return new StripeCheckoutSessionCreateResult
            {
                IsSuccess = true,
                CheckoutUrl = sessionUrl,
                SessionId = sessionId,
                Mode = "checkout_session"
            };
        }

        string? paymentLink = GetPaymentLinkForPlan(plan);
        if (!string.IsNullOrWhiteSpace(paymentLink) &&
            (!isProduction || !paymentLink.Contains("/test_", StringComparison.OrdinalIgnoreCase)))
        {
            string redirectUrl = BuildPaymentLinkUrl(paymentLink, workspaceId, customerEmail);
            return new StripeCheckoutSessionCreateResult
            {
                IsSuccess = true,
                CheckoutUrl = redirectUrl,
                Mode = "payment_link"
            };
        }

        return new StripeCheckoutSessionCreateResult
        {
            IsSuccess = false,
            ErrorMessage = "O checkout comercial de pagamentos está em homologação neste ambiente."
        };
    }

    public async Task<StripeBillingPortalCreateResult> CreateBillingPortalSessionAsync(
        string stripeCustomerId,
        string returnUrl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(stripeCustomerId))
        {
            return new StripeBillingPortalCreateResult
            {
                IsSuccess = false,
                ErrorMessage = "Esta organização ainda não possui um identificador de faturamento vinculado na Stripe."
            };
        }

        string? secretKey = GetStripeSecretKey();
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            return new StripeBillingPortalCreateResult
            {
                IsSuccess = false,
                ErrorMessage = "O Portal do Cliente Stripe não está configurado neste ambiente."
            };
        }

        Dictionary<string, string> formFields = new Dictionary<string, string>
        {
            { "customer", stripeCustomerId.Trim() },
            { "return_url", returnUrl }
        };

        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{StripeApiBaseUrl}/billing_portal/sessions")
        {
            Content = new FormUrlEncodedContent(formFields)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new StripeBillingPortalCreateResult
            {
                IsSuccess = false,
                ErrorMessage = "Não foi possível abrir o Portal do Assinante na Stripe. Verifique se o Customer Portal está ativado no painel da Stripe."
            };
        }

        string jsonBody = await response.Content.ReadAsStringAsync(cancellationToken);
        using JsonDocument doc = JsonDocument.Parse(jsonBody);
        string? portalUrl = GetJsonString(doc.RootElement, "url");

        if (string.IsNullOrWhiteSpace(portalUrl))
        {
            return new StripeBillingPortalCreateResult
            {
                IsSuccess = false,
                ErrorMessage = "URL do Portal do Cliente não retornada pela Stripe."
            };
        }

        return new StripeBillingPortalCreateResult
        {
            IsSuccess = true,
            PortalUrl = portalUrl
        };
    }

    public async Task<StripeSessionVerificationResult> VerifyCheckoutSessionAsync(
        string sessionId,
        PlanTier requestedPlan,
        CancellationToken cancellationToken = default)
    {
        string trimmedSessionId = sessionId.Trim();
        string? secretKey = GetStripeSecretKey();
        bool isProduction = IsProductionEnvironment();

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            if (isProduction || trimmedSessionId.StartsWith("cs_live_", StringComparison.OrdinalIgnoreCase))
            {
                return new StripeSessionVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "A verificação oficial de pagamento na API da Stripe não está configurada neste servidor. Não é possível ativar assinaturas reais sem a chave Stripe:SecretKey."
                };
            }

            return new StripeSessionVerificationResult
            {
                IsValid = true,
                SessionId = trimmedSessionId,
                VerifiedPlan = requestedPlan
            };
        }

        string requestUrl = $"{StripeApiBaseUrl}/checkout/sessions/{Uri.EscapeDataString(trimmedSessionId)}";
        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new StripeSessionVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Sessão de pagamento não localizada ou recusada pela API oficial da Stripe."
            };
        }

        string jsonBody = await response.Content.ReadAsStringAsync(cancellationToken);
        using JsonDocument doc = JsonDocument.Parse(jsonBody);
        JsonElement root = doc.RootElement;

        string? paymentStatus = GetJsonString(root, "payment_status");
        string? sessionStatus = GetJsonString(root, "status");

        bool isPaid = string.Equals(paymentStatus, "paid", StringComparison.OrdinalIgnoreCase) ||
            (string.Equals(paymentStatus, "no_payment_required", StringComparison.OrdinalIgnoreCase) &&
             string.Equals(sessionStatus, "complete", StringComparison.OrdinalIgnoreCase));

        if (!isPaid)
        {
            return new StripeSessionVerificationResult
            {
                IsValid = false,
                ErrorMessage = "O pagamento desta sessão na Stripe ainda não consta como quitado."
            };
        }

        string? customerId = ExtractIdOrString(root, "customer");
        string? subscriptionId = ExtractIdOrString(root, "subscription");
        Guid? clientRefWorkspaceId = ParseOptionalGuid(GetJsonString(root, "client_reference_id"))
            ?? ExtractWorkspaceIdFromMetadata(root);
        PlanTier resolvedPlan = ResolvePlanFromStripeObject(root, requestedPlan);

        return new StripeSessionVerificationResult
        {
            IsValid = true,
            SessionId = GetJsonString(root, "id") ?? trimmedSessionId,
            CustomerId = customerId,
            SubscriptionId = subscriptionId,
            ClientReferenceWorkspaceId = clientRefWorkspaceId,
            VerifiedPlan = resolvedPlan
        };
    }

    public async Task<StripeSubscriptionCancelResult> CancelSubscriptionDetailedAsync(
        string subscriptionId,
        bool cancelImmediately = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subscriptionId))
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }

        string trimmedSubId = subscriptionId.Trim();
        string? secretKey = GetStripeSecretKey();
        bool isProduction = IsProductionEnvironment();

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            if (isProduction || trimmedSubId.StartsWith("sub_live_", StringComparison.OrdinalIgnoreCase))
            {
                return new StripeSubscriptionCancelResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Chave da API Stripe ausente para cancelamento em produção."
                };
            }

            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }

        string requestUrl = $"{StripeApiBaseUrl}/subscriptions/{Uri.EscapeDataString(trimmedSubId)}";
        using HttpRequestMessage request = cancelImmediately
            ? new HttpRequestMessage(HttpMethod.Delete, requestUrl)
            : new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    { "cancel_at_period_end", "true" }
                })
            };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }

        if (!response.IsSuccessStatusCode)
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = false,
                ErrorMessage = "Não foi possível cancelar a assinatura na API oficial da Stripe."
            };
        }

        if (cancelImmediately)
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }

        string responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(responseJson))
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }

        try
        {
            using JsonDocument doc = JsonDocument.Parse(responseJson);
            JsonElement root = doc.RootElement;
            string? status = GetJsonString(root, "status");
            bool cancelAtEnd = GetJsonBoolean(root, "cancel_at_period_end") ?? false;
            DateTimeOffset? periodEndUtc = GetUnixTimestampUtc(root, "current_period_end");

            bool isAlreadyEnded = string.Equals(status, "canceled", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(status, "incomplete_expired", StringComparison.OrdinalIgnoreCase) ||
                (periodEndUtc.HasValue && periodEndUtc.Value <= DateTimeOffset.UtcNow);

            if (isAlreadyEnded || !cancelAtEnd)
            {
                return new StripeSubscriptionCancelResult
                {
                    IsSuccess = true,
                    CanceledImmediately = true
                };
            }

            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = false,
                CancelAtPeriodEnd = true,
                CurrentPeriodEndUtc = periodEndUtc
            };
        }
        catch (JsonException)
        {
            return new StripeSubscriptionCancelResult
            {
                IsSuccess = true,
                CanceledImmediately = true
            };
        }
    }

    public async Task<bool> CancelSubscriptionAsync(
        string subscriptionId,
        bool cancelImmediately = false,
        CancellationToken cancellationToken = default)
    {
        StripeSubscriptionCancelResult detail = await CancelSubscriptionDetailedAsync(
            subscriptionId,
            cancelImmediately,
            cancellationToken);
        return detail.IsSuccess;
    }

    public StripeWebhookEventResult ParseAndVerifyWebhookEvent(
        string rawJsonPayload,
        string? stripeSignatureHeader)
    {
        string? webhookSecret = GetConfiguredValue("Stripe:WebhookSecret", "STRIPE_WEBHOOK_SECRET");

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return new StripeWebhookEventResult
            {
                IsSignatureValid = false,
                ErrorMessage = "Segredo de webhook da Stripe (Stripe:WebhookSecret) não configurado."
            };
        }

        if (string.IsNullOrWhiteSpace(rawJsonPayload) || string.IsNullOrWhiteSpace(stripeSignatureHeader))
        {
            return new StripeWebhookEventResult
            {
                IsSignatureValid = false,
                ErrorMessage = "Assinatura Stripe-Signature ou corpo do webhook ausente."
            };
        }

        if (!VerifyStripeSignature(rawJsonPayload, stripeSignatureHeader, webhookSecret))
        {
            return new StripeWebhookEventResult
            {
                IsSignatureValid = false,
                ErrorMessage = "Assinatura criptográfica do webhook da Stripe inválida ou expirada."
            };
        }

        try
        {
            using JsonDocument doc = JsonDocument.Parse(rawJsonPayload);
            JsonElement root = doc.RootElement;

            string? eventId = GetJsonString(root, "id");
            string? eventType = GetJsonString(root, "type");

            string? sessionId = null;
            string? customerId = null;
            string? subscriptionId = null;
            string? subscriptionStatus = null;
            bool? cancelAtPeriodEnd = null;
            DateTimeOffset? currentPeriodEndUtc = null;
            bool isFullRefund = false;
            Guid? clientRefWorkspaceId = null;
            PlanTier? resolvedPlan = null;

            if (root.TryGetProperty("data", out JsonElement dataElement) &&
                dataElement.ValueKind == JsonValueKind.Object &&
                dataElement.TryGetProperty("object", out JsonElement objElement) &&
                objElement.ValueKind == JsonValueKind.Object)
            {
                string? objectType = GetJsonString(objElement, "object");
                customerId = ExtractIdOrString(objElement, "customer");
                clientRefWorkspaceId = ParseOptionalGuid(GetJsonString(objElement, "client_reference_id"))
                    ?? ExtractWorkspaceIdFromMetadata(objElement);

                if (string.Equals(objectType, "checkout.session", StringComparison.OrdinalIgnoreCase) ||
                    (eventType != null && eventType.StartsWith("checkout.session.", StringComparison.OrdinalIgnoreCase)))
                {
                    sessionId = GetJsonString(objElement, "id");
                    subscriptionId = ExtractIdOrString(objElement, "subscription");
                    resolvedPlan = ResolvePlanFromStripeObject(objElement, PlanTier.Professional);
                }
                else if (string.Equals(objectType, "subscription", StringComparison.OrdinalIgnoreCase) ||
                         (eventType != null && eventType.StartsWith("customer.subscription.", StringComparison.OrdinalIgnoreCase)))
                {
                    subscriptionId = GetJsonString(objElement, "id");
                    subscriptionStatus = GetJsonString(objElement, "status");
                    cancelAtPeriodEnd = GetJsonBoolean(objElement, "cancel_at_period_end");
                    currentPeriodEndUtc = GetUnixTimestampUtc(objElement, "current_period_end");
                    resolvedPlan = ResolvePlanFromSubscriptionObject(objElement);
                }
                else if (string.Equals(objectType, "invoice", StringComparison.OrdinalIgnoreCase) ||
                         (eventType != null && eventType.StartsWith("invoice.", StringComparison.OrdinalIgnoreCase)))
                {
                    subscriptionId = ExtractIdOrString(objElement, "subscription");
                    currentPeriodEndUtc = ExtractInvoicePeriodEndUtc(objElement);
                    resolvedPlan = ResolvePlanFromInvoiceObject(objElement);
                }
                else if (string.Equals(objectType, "charge", StringComparison.OrdinalIgnoreCase) ||
                         (eventType != null && eventType.StartsWith("charge.", StringComparison.OrdinalIgnoreCase)))
                {
                    bool refundedFlag = GetJsonBoolean(objElement, "refunded") ?? false;
                    long amount = GetJsonLong(objElement, "amount") ?? 0;
                    long amountRefunded = GetJsonLong(objElement, "amount_refunded") ?? 0;
                    isFullRefund = refundedFlag || (amount > 0 && amountRefunded >= amount);
                }
                else
                {
                    subscriptionId = ExtractIdOrString(objElement, "subscription");
                }
            }

            return new StripeWebhookEventResult
            {
                IsSignatureValid = true,
                EventId = eventId,
                EventType = eventType,
                SessionId = sessionId,
                CustomerId = customerId,
                SubscriptionId = subscriptionId,
                SubscriptionStatus = subscriptionStatus,
                CancelAtPeriodEnd = cancelAtPeriodEnd,
                CurrentPeriodEndUtc = currentPeriodEndUtc,
                IsFullRefund = isFullRefund,
                ClientReferenceWorkspaceId = clientRefWorkspaceId,
                ResolvedPlan = resolvedPlan
            };
        }
        catch (JsonException)
        {
            return new StripeWebhookEventResult
            {
                IsSignatureValid = false,
                ErrorMessage = "Payload JSON do webhook da Stripe malformado."
            };
        }
    }

    private string? GetStripeSecretKey()
    {
        return GetConfiguredValue("Stripe:SecretKey", "STRIPE_SECRET_KEY");
    }

    private string? GetPriceIdForPlan(PlanTier plan)
    {
        return plan switch
        {
            PlanTier.Professional => GetConfiguredValue("Stripe:ProPriceId", "STRIPE_PRO_PRICE_ID"),
            PlanTier.Enterprise => GetConfiguredValue("Stripe:EnterprisePriceId", "STRIPE_ENTERPRISE_PRICE_ID"),
            _ => null
        };
    }

    private string? GetPaymentLinkForPlan(PlanTier plan)
    {
        return plan switch
        {
            PlanTier.Professional => GetConfiguredValue("Stripe:ProPaymentLinkUrl", "STRIPE_PRO_PAYMENT_LINK_URL")
                ?? GetConfiguredValue("VITE_STRIPE_PRO_URL", "VITE_STRIPE_PRO_URL"),
            PlanTier.Enterprise => GetConfiguredValue("Stripe:EnterprisePaymentLinkUrl", "STRIPE_ENTERPRISE_PAYMENT_LINK_URL")
                ?? GetConfiguredValue("VITE_STRIPE_ENTERPRISE_URL", "VITE_STRIPE_ENTERPRISE_URL"),
            _ => null
        };
    }

    private string? GetConfiguredValue(string configKey, string envKey)
    {
        string? val = _configuration[configKey]
            ?? _configuration[envKey]
            ?? Environment.GetEnvironmentVariable(envKey);
        return string.IsNullOrWhiteSpace(val) ? null : val.Trim();
    }

    private bool IsProductionEnvironment()
    {
        string? env = _configuration["ASPNETCORE_ENVIRONMENT"]
            ?? _configuration["DOTNET_ENVIRONMENT"]
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");

        return string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase);
    }

    private static string EnsureSessionIdPlaceholder(string successUrl)
    {
        if (successUrl.Contains("{CHECKOUT_SESSION_ID}", StringComparison.Ordinal))
        {
            return successUrl;
        }

        string separator = successUrl.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return $"{successUrl}{separator}session_id={{CHECKOUT_SESSION_ID}}";
    }

    private static string BuildPaymentLinkUrl(string baseUrl, Guid workspaceId, string? customerEmail)
    {
        try
        {
            UriBuilder builder = new UriBuilder(baseUrl);
            List<string> queryParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(builder.Query))
            {
                queryParts.Add(builder.Query.TrimStart('?'));
            }
            queryParts.Add($"client_reference_id={Uri.EscapeDataString(workspaceId.ToString())}");
            if (!string.IsNullOrWhiteSpace(customerEmail))
            {
                queryParts.Add($"prefilled_email={Uri.EscapeDataString(customerEmail.Trim())}");
            }
            builder.Query = string.Join("&", queryParts);
            return builder.Uri.ToString();
        }
        catch (UriFormatException)
        {
            return baseUrl;
        }
    }

    private static bool VerifyStripeSignature(string payload, string signatureHeader, string secret)
    {
        string[] parts = signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        long timestamp = 0;
        List<string> candidateSignatures = new List<string>();

        foreach (string part in parts)
        {
            int eqIdx = part.IndexOf('=');
            if (eqIdx <= 0 || eqIdx >= part.Length - 1)
            {
                continue;
            }

            string key = part.Substring(0, eqIdx);
            string val = part.Substring(eqIdx + 1);

            if (key == "t")
            {
                long.TryParse(val, out timestamp);
            }
            else if (key == "v1")
            {
                candidateSignatures.Add(val);
            }
        }

        if (timestamp <= 0 || candidateSignatures.Count == 0)
        {
            return false;
        }

        long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(nowUnix - timestamp) > WebhookReplayToleranceSeconds)
        {
            return false;
        }

        string signedPayload = $"{timestamp}.{payload}";
        byte[] keyBytes = Encoding.UTF8.GetBytes(secret);
        byte[] payloadBytes = Encoding.UTF8.GetBytes(signedPayload);
        byte[] computedHash = HMACSHA256.HashData(keyBytes, payloadBytes);

        foreach (string hexSignature in candidateSignatures)
        {
            try
            {
                byte[] expectedBytes = Convert.FromHexString(hexSignature);
                if (expectedBytes.Length == computedHash.Length &&
                    CryptographicOperations.FixedTimeEquals(computedHash, expectedBytes))
                {
                    return true;
                }
            }
            catch (FormatException)
            {
                // Ignora assinatura v1 que não seja hexadecimal válida
            }
        }

        return false;
    }

    private PlanTier ResolvePlanFromStripeObject(JsonElement element, PlanTier fallbackPlan)
    {
        PlanTier? metadataPlan = ExtractPlanFromMetadata(element);
        if (metadataPlan.HasValue)
        {
            return metadataPlan.Value;
        }

        long? subtotal = GetJsonLong(element, "amount_subtotal");
        if (subtotal.HasValue && subtotal.Value > 0)
        {
            return subtotal.Value >= EnterpriseMinimumAmountCents
                ? PlanTier.Enterprise
                : PlanTier.Professional;
        }

        long? total = GetJsonLong(element, "amount_total");
        if (total.HasValue && total.Value > 0)
        {
            return total.Value >= EnterpriseMinimumAmountCents
                ? PlanTier.Enterprise
                : PlanTier.Professional;
        }

        return fallbackPlan == PlanTier.Starter ? PlanTier.Professional : fallbackPlan;
    }

    private PlanTier? ResolvePlanFromSubscriptionObject(JsonElement subElement)
    {
        PlanTier? metaPlan = ExtractPlanFromMetadata(subElement);
        if (metaPlan.HasValue)
        {
            return metaPlan.Value;
        }

        string? proPriceId = GetPriceIdForPlan(PlanTier.Professional);
        string? entPriceId = GetPriceIdForPlan(PlanTier.Enterprise);

        if (subElement.TryGetProperty("items", out JsonElement itemsElem) &&
            itemsElem.ValueKind == JsonValueKind.Object &&
            itemsElem.TryGetProperty("data", out JsonElement dataArray) &&
            dataArray.ValueKind == JsonValueKind.Array)
        {
            foreach (JsonElement item in dataArray.EnumerateArray())
            {
                if (item.TryGetProperty("price", out JsonElement priceElem) &&
                    priceElem.ValueKind == JsonValueKind.Object)
                {
                    string? itemPriceId = GetJsonString(priceElem, "id");
                    if (!string.IsNullOrWhiteSpace(entPriceId) &&
                        string.Equals(itemPriceId, entPriceId, StringComparison.Ordinal))
                    {
                        return PlanTier.Enterprise;
                    }
                    if (!string.IsNullOrWhiteSpace(proPriceId) &&
                        string.Equals(itemPriceId, proPriceId, StringComparison.Ordinal))
                    {
                        return PlanTier.Professional;
                    }

                    long? unitAmount = GetJsonLong(priceElem, "unit_amount");
                    if (unitAmount.HasValue && unitAmount.Value > 0)
                    {
                        return unitAmount.Value >= EnterpriseMinimumAmountCents
                            ? PlanTier.Enterprise
                            : PlanTier.Professional;
                    }
                }
            }
        }

        return null;
    }

    private PlanTier? ResolvePlanFromInvoiceObject(JsonElement invoiceElement)
    {
        string? proPriceId = GetPriceIdForPlan(PlanTier.Professional);
        string? entPriceId = GetPriceIdForPlan(PlanTier.Enterprise);

        if (invoiceElement.TryGetProperty("lines", out JsonElement linesElem) &&
            linesElem.ValueKind == JsonValueKind.Object &&
            linesElem.TryGetProperty("data", out JsonElement dataArray) &&
            dataArray.ValueKind == JsonValueKind.Array)
        {
            foreach (JsonElement line in dataArray.EnumerateArray())
            {
                if (line.TryGetProperty("price", out JsonElement priceElem) &&
                    priceElem.ValueKind == JsonValueKind.Object)
                {
                    string? linePriceId = GetJsonString(priceElem, "id");
                    if (!string.IsNullOrWhiteSpace(entPriceId) &&
                        string.Equals(linePriceId, entPriceId, StringComparison.Ordinal))
                    {
                        return PlanTier.Enterprise;
                    }
                    if (!string.IsNullOrWhiteSpace(proPriceId) &&
                        string.Equals(linePriceId, proPriceId, StringComparison.Ordinal))
                    {
                        return PlanTier.Professional;
                    }
                }
            }
        }

        long? amountPaid = GetJsonLong(invoiceElement, "amount_paid");
        if (amountPaid.HasValue && amountPaid.Value > 0)
        {
            return amountPaid.Value >= EnterpriseMinimumAmountCents
                ? PlanTier.Enterprise
                : PlanTier.Professional;
        }

        return null;
    }

    private static DateTimeOffset? ExtractInvoicePeriodEndUtc(JsonElement invoiceElement)
    {
        if (invoiceElement.TryGetProperty("lines", out JsonElement linesElem) &&
            linesElem.ValueKind == JsonValueKind.Object &&
            linesElem.TryGetProperty("data", out JsonElement dataArray) &&
            dataArray.ValueKind == JsonValueKind.Array)
        {
            foreach (JsonElement line in dataArray.EnumerateArray())
            {
                if (line.TryGetProperty("period", out JsonElement periodElem) &&
                    periodElem.ValueKind == JsonValueKind.Object)
                {
                    DateTimeOffset? lineEnd = GetUnixTimestampUtc(periodElem, "end");
                    if (lineEnd.HasValue)
                    {
                        return lineEnd;
                    }
                }
            }
        }

        return GetUnixTimestampUtc(invoiceElement, "period_end");
    }

    private static PlanTier? ExtractPlanFromMetadata(JsonElement element)
    {
        if (element.TryGetProperty("metadata", out JsonElement metadata) &&
            metadata.ValueKind == JsonValueKind.Object)
        {
            string? metadataPlan = GetJsonString(metadata, "plan");
            if (Enum.TryParse<PlanTier>(metadataPlan, ignoreCase: true, out PlanTier parsedMetaPlan) &&
                parsedMetaPlan != PlanTier.Starter)
            {
                return parsedMetaPlan;
            }
        }

        return null;
    }

    private static Guid? ExtractWorkspaceIdFromMetadata(JsonElement element)
    {
        if (element.TryGetProperty("metadata", out JsonElement metadata) &&
            metadata.ValueKind == JsonValueKind.Object)
        {
            string? rawWsId = GetJsonString(metadata, "workspace_id");
            return ParseOptionalGuid(rawWsId);
        }

        return null;
    }

    private static string? GetJsonString(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out JsonElement prop) && prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
        }

        return null;
    }

    private static bool? GetJsonBoolean(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out JsonElement prop))
        {
            if (prop.ValueKind == JsonValueKind.True)
            {
                return true;
            }
            if (prop.ValueKind == JsonValueKind.False)
            {
                return false;
            }
        }

        return null;
    }

    private static long? GetJsonLong(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out JsonElement prop) &&
            prop.ValueKind == JsonValueKind.Number &&
            prop.TryGetInt64(out long value))
        {
            return value;
        }

        return null;
    }

    private static DateTimeOffset? GetUnixTimestampUtc(JsonElement element, string propertyName)
    {
        long? unixSeconds = GetJsonLong(element, propertyName);
        if (unixSeconds.HasValue && unixSeconds.Value > 0)
        {
            return DateTimeOffset.FromUnixTimeSeconds(unixSeconds.Value);
        }

        return null;
    }

    private static string? ExtractIdOrString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out JsonElement prop))
        {
            return null;
        }

        if (prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
        }

        if (prop.ValueKind == JsonValueKind.Object)
        {
            return GetJsonString(prop, "id");
        }

        return null;
    }

    private static Guid? ParseOptionalGuid(string? rawValue)
    {
        if (!string.IsNullOrWhiteSpace(rawValue) && Guid.TryParse(rawValue.Trim(), out Guid parsed))
        {
            return parsed;
        }

        return null;
    }
}
