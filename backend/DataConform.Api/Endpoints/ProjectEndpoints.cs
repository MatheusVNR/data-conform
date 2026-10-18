using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Projects.Dtos;
using DataConform.Domain.Entities;

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
        IApplicationDbContext dbContext,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "O nome do projeto é obrigatório." });
        }

        bool workspaceExists = await dbContext.Workspaces
            .AnyAsync(w => w.Id == workspaceId, cancellationToken);

        if (!workspaceExists)
        {
            return Results.NotFound(new { error = "Workspace informado não foi encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, workspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        ImportProject project = new ImportProject
        {
            WorkspaceId = workspaceId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            TargetSystem = request.TargetSystem?.Trim()
        };

        dbContext.ImportProjects.Add(project);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);

        await auditService.LogAsync(
            workspaceId,
            currentUserId,
            "CreateProject",
            "ImportProject",
            project.Id.ToString(),
            $"Projeto '{project.Name}' (Destino: {project.TargetSystem ?? "Genérico"}) criado.",
            cancellationToken);

        ImportProjectDto dto = new ImportProjectDto
        {
            Id = project.Id,
            WorkspaceId = project.WorkspaceId,
            Name = project.Name,
            Description = project.Description,
            TargetSystem = project.TargetSystem,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            FilesCount = 0
        };

        return Results.Created($"/api/projects/{project.Id}", dto);
    }

    private static async Task<IResult> GetProjectsByWorkspace(
        Guid workspaceId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        bool workspaceExists = await dbContext.Workspaces
            .AnyAsync(w => w.Id == workspaceId, cancellationToken);

        if (!workspaceExists)
        {
            return Results.NotFound(new { error = "Workspace informado não foi encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, workspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        List<ImportProjectDto> list = await dbContext.ImportProjects
            .Where(p => p.WorkspaceId == workspaceId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ImportProjectDto
            {
                Id = p.Id,
                WorkspaceId = p.WorkspaceId,
                Name = p.Name,
                Description = p.Description,
                TargetSystem = p.TargetSystem,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                FilesCount = p.Files.Count
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(list);
    }

    private static async Task<IResult> GetProjectById(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        ImportProject? project = await dbContext.ImportProjects
            .Include(p => p.Files)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return Results.NotFound(new { error = "Projeto de importação não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        ImportProjectDto dto = new ImportProjectDto
        {
            Id = project.Id,
            WorkspaceId = project.WorkspaceId,
            Name = project.Name,
            Description = project.Description,
            TargetSystem = project.TargetSystem,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            FilesCount = project.Files.Count
        };

        return Results.Ok(dto);
    }

    private static async Task<IResult> DeleteProject(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        ImportProject? project = await dbContext.ImportProjects
            .Include(p => p.Files)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return Results.NotFound(new { error = "Projeto de importação não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        Guid workspaceId = project.WorkspaceId;
        string projectName = project.Name;

        foreach (ImportFile file in project.Files)
        {
            await fileStorage.DeleteFileAsync(file.StoredFileName, cancellationToken);
        }

        dbContext.ImportProjects.Remove(project);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);

        await auditService.LogAsync(
            workspaceId,
            currentUserId,
            "DeleteProject",
            "ImportProject",
            projectId.ToString(),
            $"Projeto '{projectName}' e todos os seus arquivos foram excluídos.",
            cancellationToken);

        return Results.NoContent();
    }
}
