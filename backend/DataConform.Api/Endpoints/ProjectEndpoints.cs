using System.Security.Claims;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Projects.Dtos;

namespace DataConform.Api.Endpoints;

public static class ProjectEndpoints
{
    public static RouteGroupBuilder MapProjectEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api")
            .WithTags("Projects")
            .RequireAuthorization();

        group.MapPost("/workspaces/{workspaceId:guid}/projects", CreateProject)
            .WithName("CreateProject")
            .Produces<ImportProjectDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/workspaces/{workspaceId:guid}/projects", GetProjectsByWorkspace)
            .WithName("GetProjectsByWorkspace")
            .Produces<List<ImportProjectDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/projects/{projectId:guid}", GetProjectById)
            .WithName("GetProjectById")
            .Produces<ImportProjectDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/projects/{projectId:guid}", DeleteProject)
            .WithName("DeleteProject")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> CreateProject(
        Guid workspaceId,
        CreateImportProjectRequest request,
        ClaimsPrincipal claimsPrincipal,
        IProjectService projectService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<ImportProjectDto> result = await projectService.CreateProjectAsync(
            workspaceId,
            request,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult(result.Data != null ? $"/api/projects/{result.Data.Id}" : null);
    }

    private static async Task<IResult> GetProjectsByWorkspace(
        Guid workspaceId,
        ClaimsPrincipal claimsPrincipal,
        IProjectService projectService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<List<ImportProjectDto>> result = await projectService.GetProjectsByWorkspaceAsync(
            workspaceId,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> GetProjectById(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IProjectService projectService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<ImportProjectDto> result = await projectService.GetProjectByIdAsync(
            projectId,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> DeleteProject(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IProjectService projectService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        ServiceResult result = await projectService.DeleteProjectAsync(projectId, userId, cancellationToken);
        return result.ToHttpResult();
    }
}
