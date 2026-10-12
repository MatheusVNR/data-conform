namespace DataConform.Application.Common.Models;

public sealed class QuotaCheckResult
{
    public bool IsAllowed { get; init; }
    public string? Reason { get; init; }

    public static QuotaCheckResult Success() => new QuotaCheckResult { IsAllowed = true };
    public static QuotaCheckResult Denied(string reason) => new QuotaCheckResult { IsAllowed = false, Reason = reason };
}
