using System.Security.Claims;
using DataConform.Api.Endpoints;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Api.Filters;

/// <summary>
/// Filtro global de isolamento Multi-Tenant (Cross-Cutting Concern).
/// Intercepta automaticamente qualquer endpoint que receba identificadores de recursos
/// (workspaceId, projectId, fileId ou id em /api/workspaces/{id}) e valida a propriedade
/// do locatário via ITenantAccessService antes da execução do handler, impedindo IDOR por arquitetura.
/// </summary>
public class TenantIsolationEndpointFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        HttpContext httpContext = context.HttpContext;
        ClaimsPrincipal principal = httpContext.User;

        if (principal.Identity?.IsAuthenticated != true)
        {
            return await next(context);
        }

        RouteValueDictionary routeValues = httpContext.Request.RouteValues;
        if (routeValues.Count == 0)
        {
            return await next(context);
        }

        ITenantAccessService tenantAccessService = httpContext.RequestServices.GetRequiredService<ITenantAccessService>();
        CancellationToken cancellationToken = httpContext.RequestAborted;

        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(principal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(principal);

        // 1. Validação automática de rotas com {workspaceId} ou /api/workspaces/{id}
        object? rawWorkspaceId = null;
        bool hasWorkspaceRouteId = routeValues.TryGetValue("workspaceId", out rawWorkspaceId) ||
            (httpContext.Request.Path.StartsWithSegments("/api/workspaces") &&
             routeValues.TryGetValue("id", out rawWorkspaceId));

        if (hasWorkspaceRouteId && rawWorkspaceId != null && Guid.TryParse(rawWorkspaceId.ToString(), out Guid workspaceId))
        {
            ServiceResult accessResult = await tenantAccessService.VerifyWorkspaceAccessAsync(
                userId,
                primaryWorkspaceId,
                workspaceId,
                cancellationToken);

            if (!accessResult.IsSuccess)
            {
                return accessResult.ToHttpResult();
            }
        }

        // 2. Validação automática de rotas com {projectId}
        if (routeValues.TryGetValue("projectId", out object? rawProjectId) &&
            rawProjectId != null &&
            Guid.TryParse(rawProjectId.ToString(), out Guid projectId))
        {
            ServiceResult accessResult = await tenantAccessService.VerifyProjectAccessAsync(
                userId,
                primaryWorkspaceId,
                projectId,
                cancellationToken);

            if (!accessResult.IsSuccess)
            {
                return accessResult.ToHttpResult();
            }
        }

        // 3. Validação automática de rotas com {fileId}
        if (routeValues.TryGetValue("fileId", out object? rawFileId) &&
            rawFileId != null &&
            Guid.TryParse(rawFileId.ToString(), out Guid fileId))
        {
            ServiceResult accessResult = await tenantAccessService.VerifyFileAccessAsync(
                userId,
                primaryWorkspaceId,
                fileId,
                cancellationToken);

            if (!accessResult.IsSuccess)
            {
                return accessResult.ToHttpResult();
            }
        }

        return await next(context);
    }
}
