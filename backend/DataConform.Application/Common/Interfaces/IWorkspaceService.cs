using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;

namespace DataConform.Application.Common.Interfaces;

public interface IWorkspaceService
{
    Task<ServiceResult<WorkspaceDto>> CreateWorkspaceAsync(
        CreateWorkspaceRequest request,
        Guid? currentUserId,
        CancellationToken cancellationToken = default);

    Task<List<WorkspaceDto>> GetWorkspacesAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceDto>> GetWorkspaceByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceDto>> UpdateWorkspaceAsync(
        Guid id,
        UpdateWorkspaceRequest request,
        Guid? currentUserId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteWorkspaceAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> GetWorkspaceQuotaAsync(
        Guid id,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> ChangeWorkspacePlanAsync(
        Guid id,
        UpdatePlanRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> ConfirmStripeCheckoutAsync(
        Guid id,
        ConfirmCheckoutRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);
}
