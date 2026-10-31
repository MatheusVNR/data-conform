using DataConform.Domain.Enums;

namespace DataConform.Application.Common.Interfaces;

public class StripeSessionVerificationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public string? SessionId { get; set; }
    public string? CustomerId { get; set; }
    public string? SubscriptionId { get; set; }
    public Guid? ClientReferenceWorkspaceId { get; set; }
    public PlanTier? VerifiedPlan { get; set; }
}

public class StripeWebhookEventResult
{
    public bool IsSignatureValid { get; set; }
    public string? ErrorMessage { get; set; }
    public string? EventId { get; set; }
    public string? EventType { get; set; }
    public string? SessionId { get; set; }
    public string? CustomerId { get; set; }
    public string? SubscriptionId { get; set; }
    public Guid? ClientReferenceWorkspaceId { get; set; }
    public PlanTier? ResolvedPlan { get; set; }
}

public interface IStripeBillingService
{
    Task<StripeSessionVerificationResult> VerifyCheckoutSessionAsync(
        string sessionId,
        PlanTier requestedPlan,
        CancellationToken cancellationToken = default);

    Task<bool> CancelSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    StripeWebhookEventResult ParseAndVerifyWebhookEvent(
        string rawJsonPayload,
        string? stripeSignatureHeader);
}
