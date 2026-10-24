using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Application.Services;

public class TenantAccessService : ITenantAccessService
{
    private const string ForbiddenTitle = "Acesso negado à organização";
    private const string ForbiddenMessage = "Você não possui permissão para visualizar ou modificar recursos desta organização.";

    private readonly IApplicationDbContext _dbContext;

    public TenantAccessService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<HashSet<Guid>> GetAllowedWorkspaceIdsAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        HashSet<Guid> allowedWorkspaceIds = new HashSet<Guid>();

        if (userId == null && primaryWorkspaceId == null)
        {
            return allowedWorkspaceIds;
        }

        if (primaryWorkspaceId.HasValue)
        {
            allowedWorkspaceIds.Add(primaryWorkspaceId.Value);
        }

        if (userId.HasValue)
        {
            Guid? userDbWorkspaceId = await _dbContext.Users
                .Where(u => u.Id == userId.Value)
                .Select(u => (Guid?)u.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (userDbWorkspaceId.HasValue)
            {
                allowedWorkspaceIds.Add(userDbWorkspaceId.Value);
            }

            List<Guid> createdWorkspaceIds = await _dbContext.AuditLogs
                .Where(a => a.UserId == userId.Value && a.Action == "CreateWorkspace")
                .Select(a => a.WorkspaceId)
                .ToListAsync(cancellationToken);

            foreach (Guid createdId in createdWorkspaceIds)
            {
                allowedWorkspaceIds.Add(createdId);
            }
        }

        return allowedWorkspaceIds;
    }

    public async Task<bool> CanAccessWorkspaceAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid targetWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        HashSet<Guid> allowedWorkspaceIds = await GetAllowedWorkspaceIdsAsync(userId, primaryWorkspaceId, cancellationToken);
        return allowedWorkspaceIds.Contains(targetWorkspaceId);
    }

    public async Task<ServiceResult> VerifyWorkspaceAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid targetWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        bool workspaceExists = await _dbContext.Workspaces
            .IgnoreQueryFilters()
            .AnyAsync(w => w.Id == targetWorkspaceId, cancellationToken);

        if (!workspaceExists)
        {
            return ServiceResult.Failure(ServiceErrorType.NotFound, "Workspace não encontrado.");
        }

        bool canAccess = await CanAccessWorkspaceAsync(userId, primaryWorkspaceId, targetWorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult.Failure(ServiceErrorType.Forbidden, ForbiddenMessage, ForbiddenTitle);
        }

        return ServiceResult.Success();
    }

    public async Task<ServiceResult> VerifyProjectAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        Guid? projectWorkspaceId = await _dbContext.ImportProjects
            .IgnoreQueryFilters()
            .Where(p => p.Id == projectId)
            .Select(p => (Guid?)p.WorkspaceId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!projectWorkspaceId.HasValue)
        {
            return ServiceResult.Failure(ServiceErrorType.NotFound, "Projeto de importação não encontrado.");
        }

        bool canAccess = await CanAccessWorkspaceAsync(userId, primaryWorkspaceId, projectWorkspaceId.Value, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult.Failure(ServiceErrorType.Forbidden, ForbiddenMessage, ForbiddenTitle);
        }

        return ServiceResult.Success();
    }

    public async Task<ServiceResult> VerifyFileAccessAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        Guid fileId,
        CancellationToken cancellationToken = default)
    {
        Guid? fileWorkspaceId = await _dbContext.ImportFiles
            .IgnoreQueryFilters()
            .Where(f => f.Id == fileId)
            .Select(f => (Guid?)f.Project.WorkspaceId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!fileWorkspaceId.HasValue)
        {
            return ServiceResult.Failure(ServiceErrorType.NotFound, "Arquivo informado não foi encontrado.");
        }

        bool canAccess = await CanAccessWorkspaceAsync(userId, primaryWorkspaceId, fileWorkspaceId.Value, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult.Failure(ServiceErrorType.Forbidden, ForbiddenMessage, ForbiddenTitle);
        }

        return ServiceResult.Success();
    }
}
