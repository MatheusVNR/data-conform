using System.Security.Claims;

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

    public static IResult ForbiddenTenantResult()
    {
        return Results.Problem(
            statusCode: StatusCodes.Status403Forbidden,
            title: "Acesso negado à organização",
            detail: "Você não possui permissão para visualizar ou modificar recursos desta organização.");
    }
}
