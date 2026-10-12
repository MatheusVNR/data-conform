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
            .WithTags("AuditLogs");

        group.MapGet("/", GetWorkspaceAuditLogs)
            .WithName("GetWorkspaceAuditLogs")
            .Produces<List<AuditLogDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> GetWorkspaceAuditLogs(
        Guid workspaceId,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
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
