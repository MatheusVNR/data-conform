using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Interfaces;
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
        Guid? clientRefWorkspaceId = ParseOptionalGuid(GetJsonString(root, "client_reference_id"));
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

    public async Task<bool> CancelSubscriptionAsync(
        string subscriptionId,
        bool cancelImmediately = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subscriptionId))
        {
            return true;
        }

        string trimmedSubId = subscriptionId.Trim();
        string? secretKey = GetStripeSecretKey();
        bool isProduction = IsProductionEnvironment();

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            if (isProduction || trimmedSubId.StartsWith("sub_live_", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return true;
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
        if (response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NotFound)
        {
            return true;
        }

        return false;
    }

    public StripeWebhookEventResult ParseAndVerifyWebhookEvent(
        string rawJsonPayload,
        string? stripeSignatureHeader)
    {
        string? webhookSecret = _configuration["Stripe:WebhookSecret"]
            ?? _configuration["STRIPE_WEBHOOK_SECRET"]
            ?? Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET");

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

        if (!VerifyStripeSignature(rawJsonPayload, stripeSignatureHeader, webhookSecret.Trim()))
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
            Guid? clientRefWorkspaceId = null;
            PlanTier? resolvedPlan = null;

            if (root.TryGetProperty("data", out JsonElement dataElement) &&
                dataElement.ValueKind == JsonValueKind.Object &&
                dataElement.TryGetProperty("object", out JsonElement objElement) &&
                objElement.ValueKind == JsonValueKind.Object)
            {
                string? objectType = GetJsonString(objElement, "object");
                customerId = ExtractIdOrString(objElement, "customer");
                clientRefWorkspaceId = ParseOptionalGuid(GetJsonString(objElement, "client_reference_id"));

                if (string.Equals(objectType, "checkout.session", StringComparison.OrdinalIgnoreCase))
                {
                    sessionId = GetJsonString(objElement, "id");
                    subscriptionId = ExtractIdOrString(objElement, "subscription");
                    resolvedPlan = ResolvePlanFromStripeObject(objElement, PlanTier.Professional);
                }
                else if (string.Equals(objectType, "subscription", StringComparison.OrdinalIgnoreCase))
                {
                    subscriptionId = GetJsonString(objElement, "id");
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
        string? configured = _configuration["Stripe:SecretKey"]
            ?? _configuration["STRIPE_SECRET_KEY"]
            ?? Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");

        return string.IsNullOrWhiteSpace(configured) ? null : configured.Trim();
    }

    private bool IsProductionEnvironment()
    {
        string? env = _configuration["ASPNETCORE_ENVIRONMENT"]
            ?? _configuration["DOTNET_ENVIRONMENT"]
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");

        return string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase);
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

    private static PlanTier ResolvePlanFromStripeObject(JsonElement element, PlanTier fallbackPlan)
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

        if (element.TryGetProperty("amount_subtotal", out JsonElement subtotalElem) &&
            subtotalElem.ValueKind == JsonValueKind.Number &&
            subtotalElem.TryGetInt64(out long amountSubtotal) &&
            amountSubtotal > 0)
        {
            return amountSubtotal >= EnterpriseMinimumAmountCents
                ? PlanTier.Enterprise
                : PlanTier.Professional;
        }

        if (element.TryGetProperty("amount_total", out JsonElement totalElem) &&
            totalElem.ValueKind == JsonValueKind.Number &&
            totalElem.TryGetInt64(out long amountTotal) &&
            amountTotal > 0)
        {
            return amountTotal >= EnterpriseMinimumAmountCents
                ? PlanTier.Enterprise
                : PlanTier.Professional;
        }

        return fallbackPlan == PlanTier.Starter ? PlanTier.Professional : fallbackPlan;
    }

    private static string? GetJsonString(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out JsonElement prop) && prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
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
