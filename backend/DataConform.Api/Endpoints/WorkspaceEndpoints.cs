using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static RouteGroupBuilder MapWorkspaceEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/workspaces")
            .WithTags("Workspaces");

        group.MapPost("/", CreateWorkspace)
            .WithName("CreateWorkspace")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/", GetWorkspaces)
            .WithName("GetWorkspaces")
            .Produces<List<WorkspaceDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", GetWorkspaceById)
            .WithName("GetWorkspaceById")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:guid}", UpdateWorkspace)
            .WithName("UpdateWorkspace")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", DeleteWorkspace)
            .WithName("DeleteWorkspace")
            .RequireAuthorization()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{id:guid}/quota", GetWorkspaceQuota)
            .WithName("GetWorkspaceQuota")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/change-plan", ChangeWorkspacePlan)
            .WithName("ChangeWorkspacePlan")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/checkout/confirm", ConfirmStripeCheckout)
            .WithName("ConfirmStripeCheckout")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> CreateWorkspace(
        CreateWorkspaceRequest request,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "O nome da organização / workspace é obrigatório." });
        }

        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return Results.BadRequest(new { error = "O identificador (slug) do workspace é obrigatório." });
        }

        string normalizedSlug = request.Slug.Trim().ToLowerInvariant();

        bool slugExists = await dbContext.Workspaces
            .AnyAsync(w => w.Slug == normalizedSlug, cancellationToken);

        if (slugExists)
        {
            return Results.Conflict(new { error = $"Já existe uma organização registrada com o identificador '{normalizedSlug}'." });
        }

        Workspace workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Slug = normalizedSlug,
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        dbContext.Workspaces.Add(workspace);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);

        await auditService.LogAsync(
            workspace.Id,
            currentUserId,
            "CreateWorkspace",
            "Workspace",
            workspace.Id.ToString(),
            $"Organização '{workspace.Name}' ({workspace.Slug}) criada no plano Starter.",
            cancellationToken);

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
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        HashSet<Guid> allowedWorkspaceIds = await TenantAuthorizationHelper.GetAllowedWorkspaceIdsAsync(
            claimsPrincipal,
            dbContext,
            cancellationToken);

        // Isolamento Multi-tenant estrito: visitantes não autenticados não visualizam organizações de terceiros
        if (allowedWorkspaceIds.Count == 0)
        {
            List<WorkspaceDto> emptyList = new List<WorkspaceDto>();
            return Results.Ok(emptyList);
        }

        List<WorkspaceDto> list = await dbContext.Workspaces
            .Where(w => allowedWorkspaceIds.Contains(w.Id))
            .OrderByDescending(w => w.CreatedAt)
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
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        Workspace? workspace = await dbContext.Workspaces
            .Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return Results.NotFound(new { error = "Organização / Workspace não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
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

    private static async Task<IResult> UpdateWorkspace(
        Guid id,
        UpdateWorkspaceRequest request,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "O novo nome da organização é obrigatório." });
        }

        Workspace? workspace = await dbContext.Workspaces
            .Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return Results.NotFound(new { error = "Organização / Workspace não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        string oldName = workspace.Name;
        workspace.Name = request.Name.Trim();
        workspace.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);

        await auditService.LogAsync(
            workspace.Id,
            currentUserId,
            "UpdateWorkspace",
            "Workspace",
            workspace.Id.ToString(),
            $"Nome da organização alterado de '{oldName}' para '{workspace.Name}'.",
            cancellationToken);

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

    private static async Task<IResult> DeleteWorkspace(
        Guid id,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        CancellationToken cancellationToken)
    {
        Workspace? workspace = await dbContext.Workspaces
            .Include(w => w.Projects)
                .ThenInclude(p => p.Files)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return Results.NotFound(new { error = "Organização / Workspace não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        bool hasBoundUsers = await dbContext.Users.AnyAsync(u => u.WorkspaceId == id, cancellationToken);
        if (hasBoundUsers)
        {
            return Results.BadRequest(new { error = "Esta é a organização matriz vinculada à sua conta e não pode ser removida. Você pode renomeá-la livremente acima." });
        }

        // Excluir arquivos físicos de todos os projetos do workspace
        List<string> storedFileNames = new List<string>();
        foreach (ImportProject project in workspace.Projects)
        {
            foreach (ImportFile file in project.Files)
            {
                storedFileNames.Add(file.StoredFileName);
            }
        }

        dbContext.Workspaces.Remove(workspace);
        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (string storedFileName in storedFileNames)
        {
            await fileStorage.DeleteFileAsync(storedFileName, cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> GetWorkspaceQuota(
        Guid id,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        ISubscriptionQuotaService quotaService,
        CancellationToken cancellationToken)
    {
        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        try
        {
            WorkspaceQuotaDto quota = await quotaService.GetWorkspaceQuotaAsync(id, cancellationToken);
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
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        if (request.Plan != PlanTier.Starter)
        {
            return Results.BadRequest(new
            {
                error = "A ativação dos planos comerciais Professional e Enterprise requer confirmação de pagamento via Stripe."
            });
        }

        try
        {
            WorkspaceQuotaDto updated = await quotaService.UpdatePlanAsync(id, request.Plan, cancellationToken);
            string actionDetail = $"Assinatura retornada ao plano gratuito Starter.{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Motivo: {request.Reason}")}";

            Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
            await auditService.LogAsync(id, currentUserId, "ChangePlan", "Workspace", id.ToString(), actionDetail, cancellationToken);
            return Results.Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound(new { error = "Workspace não encontrado." });
        }
    }

    private static async Task<IResult> ConfirmStripeCheckout(
        Guid id,
        ConfirmCheckoutRequest request,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, id, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        if (string.IsNullOrWhiteSpace(request.SessionId) ||
            (!request.SessionId.StartsWith("cs_test_", StringComparison.OrdinalIgnoreCase) &&
             !request.SessionId.StartsWith("cs_live_", StringComparison.OrdinalIgnoreCase)) ||
            request.SessionId.Length < 16)
        {
            return Results.BadRequest(new { error = "Sessão de checkout do Stripe inválida ou ausente." });
        }

        if (request.Plan == PlanTier.Starter)
        {
            return Results.BadRequest(new { error = "O checkout de pagamento destina-se apenas aos planos Professional ou Enterprise." });
        }

        string trimmedSessionId = request.SessionId.Trim();

        // Garantir idempotência: verificar se o session_id já foi utilizado anteriormente
        bool alreadyProcessed = await dbContext.AuditLogs
            .AnyAsync(a => a.Action == "StripeCheckoutConfirmed" && a.EntityId == trimmedSessionId, cancellationToken);

        try
        {
            WorkspaceQuotaDto updated = await quotaService.UpdatePlanAsync(id, request.Plan, cancellationToken);

            if (!alreadyProcessed)
            {
                Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
                await auditService.LogAsync(
                    id,
                    currentUserId,
                    "StripeCheckoutConfirmed",
                    "StripeSession",
                    trimmedSessionId,
                    $"Pagamento confirmado via Stripe (Sessão: {trimmedSessionId[..Math.Min(18, trimmedSessionId.Length)]}...). Plano ativado: {request.Plan}.",
                    cancellationToken);
            }

            return Results.Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound(new { error = "Workspace não encontrado." });
        }
    }
}
