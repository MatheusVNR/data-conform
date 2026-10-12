using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;

namespace DataConform.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static RouteGroupBuilder MapWorkspaceEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/workspaces")
            .WithTags("Workspaces");

        group.MapPost("/", CreateWorkspace)
            .WithName("CreateWorkspace")
            .Produces<WorkspaceDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/", GetWorkspaces)
            .WithName("GetWorkspaces")
            .Produces<List<WorkspaceDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", GetWorkspaceById)
            .WithName("GetWorkspaceById")
            .Produces<WorkspaceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{id:guid}/quota", GetWorkspaceQuota)
            .WithName("GetWorkspaceQuota")
            .Produces<DataConform.Application.Common.Models.WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/change-plan", ChangeWorkspacePlan)
            .WithName("ChangeWorkspacePlan")
            .Produces<DataConform.Application.Common.Models.WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> CreateWorkspace(
        CreateWorkspaceRequest request,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "O nome do workspace é obrigatório." });
        }

        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return Results.BadRequest(new { error = "O slug do workspace é obrigatório." });
        }

        string normalizedSlug = request.Slug.Trim().ToLowerInvariant();

        bool slugExists = await dbContext.Workspaces
            .AnyAsync(w => w.Slug == normalizedSlug, cancellationToken);

        if (slugExists)
        {
            return Results.Conflict(new { error = $"Já existe um workspace com o slug '{normalizedSlug}'." });
        }

        Workspace workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Slug = normalizedSlug
        };

        dbContext.Workspaces.Add(workspace);
        await dbContext.SaveChangesAsync(cancellationToken);

        WorkspaceDto dto = new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Slug = workspace.Slug,
            CreatedAt = workspace.CreatedAt,
            UpdatedAt = workspace.UpdatedAt,
            ProjectsCount = 0,
            Plan = workspace.Plan,
            MonthlyFilesUploaded = workspace.MonthlyFilesUploaded,
            MonthlyFilesQuota = workspace.MonthlyFilesQuota,
            MaxRowsPerFile = workspace.MaxRowsPerFile
        };

        return Results.Created($"/api/workspaces/{workspace.Id}", dto);
    }

    private static async Task<IResult> GetWorkspaces(
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        List<WorkspaceDto> list = await dbContext.Workspaces
            .Select(w => new WorkspaceDto
            {
                Id = w.Id,
                Name = w.Name,
                Slug = w.Slug,
                CreatedAt = w.CreatedAt,
                UpdatedAt = w.UpdatedAt,
                ProjectsCount = w.Projects.Count,
                Plan = w.Plan,
                MonthlyFilesUploaded = w.MonthlyFilesUploaded,
                MonthlyFilesQuota = w.MonthlyFilesQuota,
                MaxRowsPerFile = w.MaxRowsPerFile
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(list);
    }

    private static async Task<IResult> GetWorkspaceById(
        Guid id,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        Workspace? workspace = await dbContext.Workspaces
            .Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return Results.NotFound(new { error = "Workspace não encontrado." });
        }

        WorkspaceDto dto = new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Slug = workspace.Slug,
            CreatedAt = workspace.CreatedAt,
            UpdatedAt = workspace.UpdatedAt,
            ProjectsCount = workspace.Projects.Count,
            Plan = workspace.Plan,
            MonthlyFilesUploaded = workspace.MonthlyFilesUploaded,
            MonthlyFilesQuota = workspace.MonthlyFilesQuota,
            MaxRowsPerFile = workspace.MaxRowsPerFile
        };

        return Results.Ok(dto);
    }

    private static async Task<IResult> GetWorkspaceQuota(
        Guid id,
        ISubscriptionQuotaService quotaService,
        CancellationToken cancellationToken)
    {
        try
        {
            DataConform.Application.Common.Models.WorkspaceQuotaDto quota = await quotaService.GetWorkspaceQuotaAsync(id, cancellationToken);
            return Results.Ok(quota);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound(new { error = "Workspace não encontrado." });
        }
    }

    private static async Task<IResult> ChangeWorkspacePlan(
        Guid id,
        UpdatePlanRequest request,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        try
        {
            DataConform.Application.Common.Models.WorkspaceQuotaDto updated = await quotaService.UpdatePlanAsync(id, request.Plan, cancellationToken);
            await auditService.LogAsync(id, null, "ChangePlan", "Workspace", id.ToString(), $"Plano alterado para {request.Plan}", cancellationToken);
            return Results.Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound(new { error = "Workspace não encontrado." });
        }
    }
}
