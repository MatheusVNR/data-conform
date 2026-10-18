using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;

namespace DataConform.Api.Endpoints;

public static class TenantAuthorizationHelper
{
    public static Guid? GetAuthenticatedUserId(ClaimsPrincipal principal)
    {
        string? rawUserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(rawUserId) && Guid.TryParse(rawUserId, out Guid parsedUserId))
        {
            return parsedUserId;
        }
        return null;
    }

    public static Guid? GetPrimaryWorkspaceId(ClaimsPrincipal principal)
    {
        string? rawWorkspaceId = principal.FindFirst("workspace_id")?.Value;
        if (!string.IsNullOrWhiteSpace(rawWorkspaceId) && Guid.TryParse(rawWorkspaceId, out Guid parsedWorkspaceId))
        {
            return parsedWorkspaceId;
        }
        return null;
    }

    public static async Task<HashSet<Guid>> GetAllowedWorkspaceIdsAsync(
        ClaimsPrincipal principal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        HashSet<Guid> allowedWorkspaceIds = new HashSet<Guid>();

        Guid? userId = GetAuthenticatedUserId(principal);
        Guid? primaryWorkspaceId = GetPrimaryWorkspaceId(principal);

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
            Guid? userDbWorkspaceId = await dbContext.Users
                .Where(u => u.Id == userId.Value)
                .Select(u => (Guid?)u.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (userDbWorkspaceId.HasValue)
            {
                allowedWorkspaceIds.Add(userDbWorkspaceId.Value);
            }

            List<Guid> createdWorkspaceIds = await dbContext.AuditLogs
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

    public static async Task<bool> CanAccessWorkspaceAsync(
        ClaimsPrincipal principal,
        Guid workspaceId,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        HashSet<Guid> allowedWorkspaceIds = await GetAllowedWorkspaceIdsAsync(principal, dbContext, cancellationToken);
        return allowedWorkspaceIds.Contains(workspaceId);
    }

    public static IResult ForbiddenTenantResult()
    {
        return Results.Problem(
            statusCode: StatusCodes.Status403Forbidden,
            title: "Acesso negado à organização",
            detail: "Você não possui permissão para visualizar ou modificar recursos desta organização.");
    }
}
