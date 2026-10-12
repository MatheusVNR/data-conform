using DataConform.Application.Common.Models;
using DataConform.Domain.Enums;

namespace DataConform.Application.Common.Interfaces;

public interface ISubscriptionQuotaService
{
    Task<QuotaCheckResult> CheckUploadQuotaAsync(Guid workspaceId, int rowCount, CancellationToken cancellationToken = default);
    Task IncrementFilesUploadedAsync(Guid workspaceId, CancellationToken cancellationToken = default);
    Task<WorkspaceQuotaDto> GetWorkspaceQuotaAsync(Guid workspaceId, CancellationToken cancellationToken = default);
    Task<WorkspaceQuotaDto> UpdatePlanAsync(Guid workspaceId, PlanTier newPlan, CancellationToken cancellationToken = default);
}
