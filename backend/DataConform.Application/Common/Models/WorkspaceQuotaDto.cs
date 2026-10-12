using DataConform.Domain.Enums;

namespace DataConform.Application.Common.Models;

public sealed class WorkspaceQuotaDto
{
    public Guid WorkspaceId { get; init; }
    public PlanTier Plan { get; init; }
    public int MonthlyFilesUploaded { get; init; }
    public int MonthlyFilesQuota { get; init; }
    public int MaxRowsPerFile { get; init; }
    public double UsagePercentage { get; init; }
}
