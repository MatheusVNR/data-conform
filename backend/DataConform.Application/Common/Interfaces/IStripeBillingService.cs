using DataConform.Application.Workspaces.Dtos;
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
    public DateTimeOffset? CurrentPeriodEndUtc { get; set; }
}

public class StripeCheckoutSessionCreateResult
{
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CheckoutUrl { get; set; }
    public string? SessionId { get; set; }
    public string Mode { get; set; } = "checkout_session";
}

public class StripeBillingPortalCreateResult
{
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public string? PortalUrl { get; set; }
}

public class StripeSubscriptionCancelResult
{
    public bool IsSuccess { get; set; }
    public bool CanceledImmediately { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public DateTimeOffset? CurrentPeriodEndUtc { get; set; }
    public string? ErrorMessage { get; set; }
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
    public string? SubscriptionStatus { get; set; }
    public bool? CancelAtPeriodEnd { get; set; }
    public DateTimeOffset? CurrentPeriodEndUtc { get; set; }
    public bool IsFullRefund { get; set; }
    public Guid? ClientReferenceWorkspaceId { get; set; }
    public PlanTier? ResolvedPlan { get; set; }
}

public interface IStripeBillingService
{
    BillingConfigDto GetBillingConfig();

    Task<StripeCheckoutSessionCreateResult> CreateCheckoutSessionAsync(
        Guid workspaceId,
        string? customerEmail,
        string? existingCustomerId,
        PlanTier plan,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default);

    Task<StripeBillingPortalCreateResult> CreateBillingPortalSessionAsync(
        string stripeCustomerId,
        string returnUrl,
        CancellationToken cancellationToken = default);

    Task<StripeSessionVerificationResult> VerifyCheckoutSessionAsync(
        string sessionId,
        PlanTier requestedPlan,
        CancellationToken cancellationToken = default);

    Task<StripeSubscriptionCancelResult> CancelSubscriptionDetailedAsync(
        string subscriptionId,
        bool cancelImmediately = false,
        CancellationToken cancellationToken = default);

    Task<bool> CancelSubscriptionAsync(
        string subscriptionId,
        bool cancelImmediately = false,
        CancellationToken cancellationToken = default);

    StripeWebhookEventResult ParseAndVerifyWebhookEvent(
        string rawJsonPayload,
        string? stripeSignatureHeader);
}
