using DataConform.Application.Common.Models;

namespace DataConform.Application.Common.Interfaces;

public interface ITenantAccessService
{
    Task<HashSet<Guid>> GetAllowedWorkspaceIdsAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<bool> CanAccessWorkspaceAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid targetWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> VerifyWorkspaceAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid targetWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> VerifyProjectAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid projectId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> VerifyFileAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid fileId,
        CancellationToken cancellationToken = default);
}
