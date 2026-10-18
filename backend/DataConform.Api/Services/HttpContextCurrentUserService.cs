using System.Security.Claims;
using DataConform.Application.Common.Interfaces;

namespace DataConform.Api.Services;

public class HttpContextCurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

    public Guid? UserId
    {
        get
        {
            ClaimsPrincipal? principal = _httpContextAccessor.HttpContext?.User;
            if (principal == null)
            {
                return null;
            }

            string? rawUserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? principal.FindFirst("sub")?.Value;

            if (!string.IsNullOrWhiteSpace(rawUserId) && Guid.TryParse(rawUserId, out Guid parsedUserId))
            {
                return parsedUserId;
            }

            return null;
        }
    }

    public Guid? PrimaryWorkspaceId
    {
        get
        {
            ClaimsPrincipal? principal = _httpContextAccessor.HttpContext?.User;
            if (principal == null)
            {
                return null;
            }

            string? rawWorkspaceId = principal.FindFirst("workspace_id")?.Value
                ?? principal.FindFirst("workspaceId")?.Value;

            if (!string.IsNullOrWhiteSpace(rawWorkspaceId) && Guid.TryParse(rawWorkspaceId, out Guid parsedWorkspaceId))
            {
                return parsedWorkspaceId;
            }

            return null;
        }
    }
}
