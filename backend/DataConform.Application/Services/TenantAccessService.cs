using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Application.Services;

public class TenantAccessService : ITenantAccessService
{
    private const string ForbiddenTitle = "Acesso negado à organização";
    private const string ForbiddenMessage = "Você não possui permissão para visualizar ou modificar recursos desta organização.";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    private readonly IApplicationDbContext _dbContext;
    private readonly IMemoryCache? _cache;

    public TenantAccessService(IApplicationDbContext dbContext, IMemoryCache? cache = null)
    {
        _dbContext = dbContext;
        _cache = cache;
    }

    public async Task<HashSet<Guid>> GetAllowedWorkspaceIdsAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        if (userId == null && primaryWorkspaceId == null)
        {
            return new HashSet<Guid>();
        }

        if (userId.HasValue && _cache != null)
        {
            string cacheKey = $"user_workspaces_{userId.Value}";
            if (_cache.TryGetValue(cacheKey, out HashSet<Guid>? cachedIds) && cachedIds != null)
            {
                HashSet<Guid> combined = new HashSet<Guid>(cachedIds);
                if (primaryWorkspaceId.HasValue)
                {
                    combined.Add(primaryWorkspaceId.Value);
                }
                return combined;
            }
        }

        HashSet<Guid> allowedWorkspaceIds = new HashSet<Guid>();

        if (primaryWorkspaceId.HasValue)
        {
            allowedWorkspaceIds.Add(primaryWorkspaceId.Value);
        }

        if (userId.HasValue)
        {
            HashSet<Guid> userSpecificIds = new HashSet<Guid>();

            Guid? userDbWorkspaceId = await _dbContext.Users
                .Where(u => u.Id == userId.Value)
                .Select(u => (Guid?)u.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (userDbWorkspaceId.HasValue)
            {
                userSpecificIds.Add(userDbWorkspaceId.Value);
            }

            List<Guid> ownedWorkspaceIds = await _dbContext.Workspaces
                .IgnoreQueryFilters()
                .Where(w => w.OwnerUserId == userId.Value)
                .Select(w => w.Id)
                .ToListAsync(cancellationToken);

            foreach (Guid ownedId in ownedWorkspaceIds)
            {
                userSpecificIds.Add(ownedId);
            }

            // Fallback para auditoria legado caso ainda não tenha sido populado o OwnerUserId
            if (ownedWorkspaceIds.Count == 0)
            {
                List<Guid> createdWorkspaceIds = await _dbContext.AuditLogs
                    .Where(a => a.UserId == userId.Value && a.Action == "CreateWorkspace")
                    .Select(a => a.WorkspaceId)
                    .ToListAsync(cancellationToken);

                foreach (Guid createdId in createdWorkspaceIds)
                {
                    userSpecificIds.Add(createdId);
                }
            }

            if (_cache != null)
            {
                string cacheKey = $"user_workspaces_{userId.Value}";
                _cache.Set(cacheKey, userSpecificIds, CacheDuration);
            }

            foreach (Guid id in userSpecificIds)
            {
                allowedWorkspaceIds.Add(id);
            }
        }

        return allowedWorkspaceIds;
    }

    public void InvalidateUserWorkspacesCache(Guid userId)
    {
        if (_cache != null)
        {
            string cacheKey = $"user_workspaces_{userId}";
            _cache.Remove(cacheKey);
        }
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
