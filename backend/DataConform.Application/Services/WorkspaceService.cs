using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class WorkspaceService : IWorkspaceService
{
    private const string ForbiddenTitle = "Acesso negado à organização";
    private const string ForbiddenMessage = "Você não possui permissão para visualizar ou modificar recursos desta organização.";

    private readonly IApplicationDbContext _dbContext;
    private readonly ISubscriptionQuotaService _quotaService;
    private readonly IAuditService _auditService;
    private readonly ITenantAccessService _tenantAccessService;

    public WorkspaceService(
        IApplicationDbContext dbContext,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        ITenantAccessService tenantAccessService)
    {
        _dbContext = dbContext;
        _quotaService = quotaService;
        _auditService = auditService;
        _tenantAccessService = tenantAccessService;
    }

    public async Task<ServiceResult<WorkspaceDto>> CreateWorkspaceAsync(
        CreateWorkspaceRequest request,
        Guid? currentUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.Validation,
                "O nome da organização / workspace é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.Validation,
                "O identificador (slug) do workspace é obrigatório.");
        }

        string normalizedSlug = request.Slug.Trim().ToLowerInvariant();

        bool slugExists = await _dbContext.Workspaces
            .IgnoreQueryFilters()
            .AnyAsync(w => w.Slug == normalizedSlug, cancellationToken);

        if (slugExists)
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.Conflict,
                $"Já existe uma organização registrada com o identificador '{normalizedSlug}'.");
        }

        Workspace workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Slug = normalizedSlug,
            OwnerUserId = currentUserId,
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        _dbContext.Workspaces.Add(workspace);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (currentUserId.HasValue)
        {
            _tenantAccessService.InvalidateUserWorkspacesCache(currentUserId.Value);
        }

        await _auditService.LogAsync(
            workspace.Id,
            currentUserId,
            "CreateWorkspace",
            "Workspace",
            workspace.Id.ToString(),
            $"Organização '{workspace.Name}' ({workspace.Slug}) criada no plano Starter.",
            cancellationToken);

        WorkspaceDto dto = MapToWorkspaceDto(workspace, 0);
        return ServiceResult<WorkspaceDto>.Success(dto);
    }

    public async Task<List<WorkspaceDto>> GetWorkspacesAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        HashSet<Guid> allowedWorkspaceIds = await _tenantAccessService.GetAllowedWorkspaceIdsAsync(
            userId,
            primaryWorkspaceId,
            cancellationToken);

        if (allowedWorkspaceIds.Count == 0)
        {
            return new List<WorkspaceDto>();
        }

        List<WorkspaceDto> list = await _dbContext.Workspaces
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

        return list;
    }

    public async Task<ServiceResult<WorkspaceDto>> GetWorkspaceByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _dbContext.Workspaces
            .Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.NotFound,
                "Organização / Workspace não encontrado.");
        }

        WorkspaceDto dto = MapToWorkspaceDto(workspace, workspace.Projects.Count);
        return ServiceResult<WorkspaceDto>.Success(dto);
    }

    public async Task<ServiceResult<WorkspaceDto>> UpdateWorkspaceAsync(
        Guid id,
        UpdateWorkspaceRequest request,
        Guid? currentUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.Validation,
                "O novo nome da organização é obrigatório.");
        }

        Workspace? workspace = await _dbContext.Workspaces
            .Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return ServiceResult<WorkspaceDto>.Failure(
                ServiceErrorType.NotFound,
                "Organização / Workspace não encontrado.");
        }

        string oldName = workspace.Name;
        workspace.Name = request.Name.Trim();
        workspace.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            workspace.Id,
            currentUserId,
            "UpdateWorkspace",
            "Workspace",
            workspace.Id.ToString(),
            $"Nome da organização alterado de '{oldName}' para '{workspace.Name}'.",
            cancellationToken);

        WorkspaceDto dto = MapToWorkspaceDto(workspace, workspace.Projects.Count);
        return ServiceResult<WorkspaceDto>.Success(dto);
    }

    public async Task<ServiceResult> DeleteWorkspaceAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return ServiceResult.Failure(
                ServiceErrorType.NotFound,
                "Organização / Workspace não encontrado.");
        }

        bool hasBoundUsers = await _dbContext.Users
            .AnyAsync(u => u.WorkspaceId == id, cancellationToken);

        if (hasBoundUsers)
        {
            return ServiceResult.Failure(
                ServiceErrorType.Validation,
                "Esta é a organização matriz vinculada à sua conta e não pode ser removida. Você pode renomeá-la livremente acima.");
        }

        Guid? ownerUserId = workspace.OwnerUserId;
        _dbContext.Workspaces.Remove(workspace);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (ownerUserId.HasValue)
        {
            _tenantAccessService.InvalidateUserWorkspacesCache(ownerUserId.Value);
        }

        return ServiceResult.Success();
    }

    public async Task<ServiceResult<WorkspaceQuotaDto>> GetWorkspaceQuotaAsync(
        Guid id,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        try
        {
            WorkspaceQuotaDto quota = await _quotaService.GetWorkspaceQuotaAsync(id, cancellationToken);
            return ServiceResult<WorkspaceQuotaDto>.Success(quota);
        }
        catch (KeyNotFoundException)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace não encontrado.");
        }
    }

    public async Task<ServiceResult<WorkspaceQuotaDto>> ChangeWorkspacePlanAsync(
        Guid id,
        UpdatePlanRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        if (request.Plan != PlanTier.Starter)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Validation,
                "A ativação dos planos comerciais Professional e Enterprise requer confirmação de pagamento via Stripe.");
        }

        try
        {
            WorkspaceQuotaDto updated = await _quotaService.UpdatePlanAsync(id, request.Plan, cancellationToken);
            string actionDetail = $"Assinatura retornada ao plano gratuito Starter.{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Motivo: {request.Reason}")}";

            await _auditService.LogAsync(
                id,
                userId,
                "ChangePlan",
                "Workspace",
                id.ToString(),
                actionDetail,
                cancellationToken);

            return ServiceResult<WorkspaceQuotaDto>.Success(updated);
        }
        catch (KeyNotFoundException)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace não encontrado.");
        }
    }

    public async Task<ServiceResult<WorkspaceQuotaDto>> ConfirmStripeCheckoutAsync(
        Guid id,
        ConfirmCheckoutRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        if (string.IsNullOrWhiteSpace(request.SessionId) ||
            (!request.SessionId.StartsWith("cs_test_", StringComparison.OrdinalIgnoreCase) &&
             !request.SessionId.StartsWith("cs_live_", StringComparison.OrdinalIgnoreCase)) ||
            request.SessionId.Length < 16)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Validation,
                "Sessão de checkout do Stripe inválida ou ausente.");
        }

        if (request.Plan == PlanTier.Starter)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Validation,
                "O checkout de pagamento destina-se apenas aos planos Professional ou Enterprise.");
        }

        string trimmedSessionId = request.SessionId.Trim();

        bool alreadyProcessed = await _dbContext.AuditLogs
            .AnyAsync(a => a.Action == "StripeCheckoutConfirmed" && a.EntityId == trimmedSessionId, cancellationToken);

        try
        {
            WorkspaceQuotaDto updated = await _quotaService.UpdatePlanAsync(id, request.Plan, cancellationToken);

            if (!alreadyProcessed)
            {
                await _auditService.LogAsync(
                    id,
                    userId,
                    "StripeCheckoutConfirmed",
                    "StripeSession",
                    trimmedSessionId,
                    $"Pagamento confirmado via Stripe (Sessão: {trimmedSessionId[..Math.Min(18, trimmedSessionId.Length)]}...). Plano ativado: {request.Plan}.",
                    cancellationToken);
            }

            return ServiceResult<WorkspaceQuotaDto>.Success(updated);
        }
        catch (KeyNotFoundException)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace não encontrado.");
        }
    }

    private static WorkspaceDto MapToWorkspaceDto(Workspace workspace, int projectsCount)
    {
        return new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Slug = workspace.Slug,
            CreatedAt = workspace.CreatedAt,
            UpdatedAt = workspace.UpdatedAt,
            ProjectsCount = projectsCount,
            Plan = workspace.Plan,
            MonthlyFilesUploaded = workspace.MonthlyFilesUploaded,
            MonthlyFilesQuota = workspace.MonthlyFilesQuota,
            MaxRowsPerFile = workspace.MaxRowsPerFile
        };
    }
}
