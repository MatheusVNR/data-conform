using System.Security.Claims;
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
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<List<AuditLogDto>> result = await auditService.GetWorkspaceAuditLogsAsync(
            workspaceId,
            userId,
            primaryWorkspaceId,
            50,
            cancellationToken);

        return result.ToHttpResult();
    }
}
