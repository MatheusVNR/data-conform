using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DataConform.Api.Endpoints;
using DataConform.Application.Common.Interfaces;

namespace DataConform.Api.Filters;

/// <summary>
/// Filtro global de isolamento Multi-Tenant (Cross-Cutting Concern).
/// Intercepta automaticamente qualquer endpoint que receba identificadores de recursos
/// (workspaceId, projectId, fileId ou id em /api/workspaces/{id}) e valida a propriedade
/// do locatário antes da execução do handler, impedindo IDOR por arquitetura em novas rotas.
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

        IApplicationDbContext dbContext = httpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
        CancellationToken cancellationToken = httpContext.RequestAborted;

        // 1. Validação automática de rotas com {workspaceId} ou /api/workspaces/{id}
        object? rawWorkspaceId = null;
        bool hasWorkspaceRouteId = routeValues.TryGetValue("workspaceId", out rawWorkspaceId) ||
            (httpContext.Request.Path.StartsWithSegments("/api/workspaces") &&
             routeValues.TryGetValue("id", out rawWorkspaceId));

        if (hasWorkspaceRouteId && rawWorkspaceId != null && Guid.TryParse(rawWorkspaceId.ToString(), out Guid workspaceId))
        {
            bool workspaceExists = await dbContext.Workspaces
                .IgnoreQueryFilters()
                .AnyAsync(w => w.Id == workspaceId, cancellationToken);

            if (!workspaceExists)
            {
                return Results.NotFound(new { error = "Workspace não encontrado." });
            }

            bool canAccessWorkspace = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(
                principal,
                workspaceId,
                dbContext,
                cancellationToken);

            if (!canAccessWorkspace)
            {
                return TenantAuthorizationHelper.ForbiddenTenantResult();
            }
        }

        // 2. Validação automática de rotas com {projectId}
        if (routeValues.TryGetValue("projectId", out object? rawProjectId) &&
            rawProjectId != null &&
            Guid.TryParse(rawProjectId.ToString(), out Guid projectId))
        {
            Guid? projectWorkspaceId = await dbContext.ImportProjects
                .IgnoreQueryFilters()
                .Where(p => p.Id == projectId)
                .Select(p => (Guid?)p.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!projectWorkspaceId.HasValue)
            {
                return Results.NotFound(new { error = "Projeto de importação não encontrado." });
            }

            bool canAccessProject = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(
                principal,
                projectWorkspaceId.Value,
                dbContext,
                cancellationToken);

            if (!canAccessProject)
            {
                return TenantAuthorizationHelper.ForbiddenTenantResult();
            }
        }

        // 3. Validação automática de rotas com {fileId}
        if (routeValues.TryGetValue("fileId", out object? rawFileId) &&
            rawFileId != null &&
            Guid.TryParse(rawFileId.ToString(), out Guid fileId))
        {
            Guid? fileWorkspaceId = await dbContext.ImportFiles
                .IgnoreQueryFilters()
                .Where(f => f.Id == fileId)
                .Select(f => (Guid?)f.Project.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!fileWorkspaceId.HasValue)
            {
                return Results.NotFound(new { error = "Arquivo informado não foi encontrado." });
            }

            bool canAccessFile = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(
                principal,
                fileWorkspaceId.Value,
                dbContext,
                cancellationToken);

            if (!canAccessFile)
            {
                return TenantAuthorizationHelper.ForbiddenTenantResult();
            }
        }

        return await next(context);
    }
}
