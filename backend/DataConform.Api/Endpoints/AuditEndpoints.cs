using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Api.Endpoints;

public static class AuditEndpoints
{
    public static RouteGroupBuilder MapAuditEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/workspaces/{workspaceId:guid}/audit-logs")
            .WithTags("AuditLogs")
            .RequireAuthorization();

        group.MapGet("/", GetWorkspaceAuditLogs)
            .WithName("GetWorkspaceAuditLogs")
            .Produces<List<AuditLogDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> GetWorkspaceAuditLogs(
        Guid workspaceId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, workspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        List<AuditLogDto> list = await dbContext.AuditLogs
            .Where(a => a.WorkspaceId == workspaceId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                WorkspaceId = a.WorkspaceId,
                UserId = a.UserId,
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                Details = a.Details,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(list);
    }
}
