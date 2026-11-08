using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class WorkspaceService : IWorkspaceService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> WebhookEventLocks = new();
    private const int MaxEnterpriseWorkspacesPerOwner = 10;

    private const string ForbiddenTitle = "Acesso negado à organização";
    private const string ForbiddenMessage = "Você não possui permissão para visualizar ou modificar recursos desta organização.";

    private readonly IApplicationDbContext _dbContext;
    private readonly ISubscriptionQuotaService _quotaService;
    private readonly IAuditService _auditService;
    private readonly ITenantAccessService _tenantAccessService;
    private readonly IStripeBillingService? _stripeBillingService;

    public WorkspaceService(
        IApplicationDbContext dbContext,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        ITenantAccessService tenantAccessService,
        IStripeBillingService? stripeBillingService = null)
    {
        _dbContext = dbContext;
        _quotaService = quotaService;
        _auditService = auditService;
        _tenantAccessService = tenantAccessService;
        _stripeBillingService = stripeBillingService;
    }

    public BillingConfigDto GetBillingConfig()
    {
        if (_stripeBillingService == null)
        {
            return new BillingConfigDto
            {
                CheckoutEnabled = false,
                CustomerPortalEnabled = false,
                IsLiveMode = false
            };
        }

        return _stripeBillingService.GetBillingConfig();
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

        PlanTier initialPlan = PlanTier.Starter;
        int initialQuota = 5;
        int initialMaxRows = 500;

        if (currentUserId.HasValue)
        {
            Guid uid = currentUserId.Value;
            List<Workspace> userWorkspaces = await _dbContext.Workspaces
                .IgnoreQueryFilters()
                .Where(w => w.OwnerUserId == uid || w.Users.Any(u => u.Id == uid))
                .ToListAsync(cancellationToken);

            if (userWorkspaces.Count >= 1)
            {
                bool hasEnterprise = userWorkspaces.Any(w => w.Plan == PlanTier.Enterprise);
                if (!hasEnterprise)
                {
                    return ServiceResult<WorkspaceDto>.Failure(
                        ServiceErrorType.QuotaExceeded,
                        "O seu plano atual inclui 1 organização (Workspace). Faça upgrade para o plano Enterprise para criar múltiplos ambientes isolados por cliente ou filial.",
                        "Limite de organizações do plano atingido");
                }

                if (userWorkspaces.Count >= MaxEnterpriseWorkspacesPerOwner)
                {
                    return ServiceResult<WorkspaceDto>.Failure(
                        ServiceErrorType.QuotaExceeded,
                        $"Limite máximo de {MaxEnterpriseWorkspacesPerOwner} organizações atingido para a conta Enterprise.",
                        "Limite de organizações atingido");
                }

                initialPlan = PlanTier.Enterprise;
                initialQuota = 10_000;
                initialMaxRows = 1_000_000;
            }
        }

        Workspace workspace = new Workspace
        {
            Name = request.Name.Trim(),
            Slug = normalizedSlug,
            OwnerUserId = currentUserId,
            Plan = initialPlan,
            MonthlyFilesQuota = initialQuota,
            MaxRowsPerFile = initialMaxRows,
            QuotaPeriodStartedAtUtc = DateTimeOffset.UtcNow
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
            $"Organização '{workspace.Name}' ({workspace.Slug}) criada no plano {initialPlan}.",
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
                MaxRowsPerFile = w.MaxRowsPerFile,
                CancelAtPeriodEnd = w.CancelAtPeriodEnd,
                PlanExpiresAtUtc = w.PlanExpiresAtUtc,
                HasActiveSubscription = w.StripeSubscriptionId != null && w.StripeSubscriptionId != ""
            })
            .ToListAsync(cancellationToken);

        return list;
    }

    public async Task<ServiceResult<WorkspaceDto>> GetWorkspaceByIdAsync(
        Guid id,
        Guid? userId = null,
        Guid? primaryWorkspaceId = null,
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

        if (userId.HasValue || primaryWorkspaceId.HasValue)
        {
            bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
            if (!canAccess)
            {
                return ServiceResult<WorkspaceDto>.Failure(
                    ServiceErrorType.Forbidden,
                    ForbiddenMessage,
                    ForbiddenTitle);
            }
        }

        WorkspaceDto dto = MapToWorkspaceDto(workspace, workspace.Projects.Count);
        return ServiceResult<WorkspaceDto>.Success(dto);
    }

    public async Task<ServiceResult<WorkspaceDto>> UpdateWorkspaceAsync(
        Guid id,
        UpdateWorkspaceRequest request,
        Guid? currentUserId,
        Guid? primaryWorkspaceId = null,
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

        if (currentUserId.HasValue || primaryWorkspaceId.HasValue)
        {
            bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(currentUserId, primaryWorkspaceId, id, cancellationToken);
            if (!canAccess)
            {
                return ServiceResult<WorkspaceDto>.Failure(
                    ServiceErrorType.Forbidden,
                    ForbiddenMessage,
                    ForbiddenTitle);
            }
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
        Guid? currentUserId = null,
        Guid? primaryWorkspaceId = null,
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

        if (currentUserId.HasValue || primaryWorkspaceId.HasValue)
        {
            bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(currentUserId, primaryWorkspaceId, id, cancellationToken);
            if (!canAccess)
            {
                return ServiceResult.Failure(
                    ServiceErrorType.Forbidden,
                    ForbiddenMessage,
                    ForbiddenTitle);
            }
        }

        bool hasBoundUsers = await _dbContext.Users
            .AnyAsync(u => u.WorkspaceId == id, cancellationToken);

        if (hasBoundUsers)
        {
            return ServiceResult.Failure(
                ServiceErrorType.Validation,
                "Esta é a organização matriz vinculada à sua conta e não pode ser removida. Você pode renomeá-la livremente acima.");
        }

        if (!string.IsNullOrWhiteSpace(workspace.StripeSubscriptionId) && _stripeBillingService != null)
        {
            await _stripeBillingService.CancelSubscriptionAsync(
                workspace.StripeSubscriptionId,
                cancelImmediately: true,
                cancellationToken: cancellationToken);
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

    public async Task<ServiceResult<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(
        Guid id,
        CreateCheckoutSessionRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        string? customerEmail,
        string defaultOriginUrl,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<CheckoutSessionResponseDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        if (request.Plan == PlanTier.Starter)
        {
            return ServiceResult<CheckoutSessionResponseDto>.Failure(
                ServiceErrorType.Validation,
                "O checkout de pagamento destina-se apenas aos planos Professional ou Enterprise.");
        }

        if (_stripeBillingService == null)
        {
            return ServiceResult<CheckoutSessionResponseDto>.Failure(
                ServiceErrorType.Validation,
                "O serviço de faturamento Stripe não está disponível neste ambiente.");
        }

        Workspace? workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return ServiceResult<CheckoutSessionResponseDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace não encontrado.");
        }

        string safeOrigin = string.IsNullOrWhiteSpace(defaultOriginUrl)
            ? "https://dataconform.com.br"
            : defaultOriginUrl.TrimEnd('/');

        string successUrl = IsAllowedRedirectUrl(request.SuccessUrl, safeOrigin)
            ? request.SuccessUrl!.Trim()
            : $"{safeOrigin}/?session_id={{CHECKOUT_SESSION_ID}}";

        string cancelUrl = IsAllowedRedirectUrl(request.CancelUrl, safeOrigin)
            ? request.CancelUrl!.Trim()
            : $"{safeOrigin}/";

        StripeCheckoutSessionCreateResult creation = await _stripeBillingService.CreateCheckoutSessionAsync(
            workspace.Id,
            customerEmail,
            workspace.StripeCustomerId,
            request.Plan,
            successUrl,
            cancelUrl,
            cancellationToken);

        if (!creation.IsSuccess || string.IsNullOrWhiteSpace(creation.CheckoutUrl))
        {
            return ServiceResult<CheckoutSessionResponseDto>.Failure(
                ServiceErrorType.Validation,
                creation.ErrorMessage ?? "Não foi possível iniciar o checkout de pagamento.");
        }

        await _auditService.LogAsync(
            workspace.Id,
            userId,
            "StripeCheckoutInitiated",
            "Workspace",
            workspace.Id.ToString(),
            $"Checkout iniciado para o plano {request.Plan} ({creation.Mode}).",
            cancellationToken);

        return ServiceResult<CheckoutSessionResponseDto>.Success(new CheckoutSessionResponseDto
        {
            CheckoutUrl = creation.CheckoutUrl,
            SessionId = creation.SessionId,
            Mode = creation.Mode
        });
    }

    public async Task<ServiceResult<BillingPortalResponseDto>> CreateBillingPortalSessionAsync(
        Guid id,
        CreateBillingPortalRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        string defaultOriginUrl,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, id, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<BillingPortalResponseDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        if (_stripeBillingService == null)
        {
            return ServiceResult<BillingPortalResponseDto>.Failure(
                ServiceErrorType.Validation,
                "O Portal do Cliente Stripe não está configurado neste ambiente.");
        }

        Workspace? workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workspace == null)
        {
            return ServiceResult<BillingPortalResponseDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace não encontrado.");
        }

        if (string.IsNullOrWhiteSpace(workspace.StripeCustomerId))
        {
            return ServiceResult<BillingPortalResponseDto>.Failure(
                ServiceErrorType.Validation,
                "Esta organização não possui um cadastro ativo de cobrança na Stripe.");
        }

        string safeOrigin = string.IsNullOrWhiteSpace(defaultOriginUrl)
            ? "https://dataconform.com.br"
            : defaultOriginUrl.TrimEnd('/');

        string returnUrl = IsAllowedRedirectUrl(request.ReturnUrl, safeOrigin)
            ? request.ReturnUrl!.Trim()
            : $"{safeOrigin}/";

        StripeBillingPortalCreateResult portal = await _stripeBillingService.CreateBillingPortalSessionAsync(
            workspace.StripeCustomerId,
            returnUrl,
            cancellationToken);

        if (!portal.IsSuccess || string.IsNullOrWhiteSpace(portal.PortalUrl))
        {
            return ServiceResult<BillingPortalResponseDto>.Failure(
                ServiceErrorType.Validation,
                portal.ErrorMessage ?? "Não foi possível abrir o Portal do Cliente Stripe.");
        }

        return ServiceResult<BillingPortalResponseDto>.Success(new BillingPortalResponseDto
        {
            PortalUrl = portal.PortalUrl
        });
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
            Workspace? workspace = await _dbContext.Workspaces
                .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

            if (workspace == null)
            {
                return ServiceResult<WorkspaceQuotaDto>.Failure(
                    ServiceErrorType.NotFound,
                    "Workspace não encontrado.");
            }

            if (!string.IsNullOrWhiteSpace(workspace.StripeSubscriptionId) && _stripeBillingService != null)
            {
                StripeSubscriptionCancelResult cancelDetail = await _stripeBillingService.CancelSubscriptionDetailedAsync(
                    workspace.StripeSubscriptionId,
                    cancelImmediately: false,
                    cancellationToken: cancellationToken);

                if (!cancelDetail.IsSuccess)
                {
                    return ServiceResult<WorkspaceQuotaDto>.Failure(
                        ServiceErrorType.Validation,
                        cancelDetail.ErrorMessage ?? "Não foi possível cancelar a cobrança recorrente na Stripe neste instante. Tente novamente em alguns segundos.");
                }

                if (cancelDetail.CancelAtPeriodEnd && !cancelDetail.CanceledImmediately)
                {
                    workspace.CancelAtPeriodEnd = true;
                    workspace.PlanExpiresAtUtc = cancelDetail.CurrentPeriodEndUtc;
                    workspace.UpdatedAt = DateTimeOffset.UtcNow;
                    await _dbContext.SaveChangesAsync(cancellationToken);

                    string scheduledDetail = $"Cancelamento agendado para o fim do ciclo pago ({workspace.PlanExpiresAtUtc:dd/MM/yyyy}).{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Motivo: {request.Reason}")}";
                    await _auditService.LogAsync(
                        id,
                        userId,
                        "SchedulePlanCancellation",
                        "Workspace",
                        id.ToString(),
                        scheduledDetail,
                        cancellationToken);

                    WorkspaceQuotaDto activeUntilEnd = await _quotaService.GetWorkspaceQuotaAsync(id, cancellationToken);
                    return ServiceResult<WorkspaceQuotaDto>.Success(activeUntilEnd);
                }
            }

            workspace.StripeSubscriptionId = null;
            workspace.CancelAtPeriodEnd = false;
            workspace.PlanExpiresAtUtc = null;

            WorkspaceQuotaDto updated = await _quotaService.UpdatePlanAsync(id, PlanTier.Starter, cancellationToken);
            await DowngradeInheritedSecondaryWorkspacesAsync(workspace.OwnerUserId, workspace.Id, cancellationToken);

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

        bool usedByAnotherWorkspace = await _dbContext.AuditLogs
            .IgnoreQueryFilters()
            .AnyAsync(
                a => a.Action == "StripeCheckoutConfirmed" &&
                     a.EntityId == trimmedSessionId &&
                     a.WorkspaceId != id,
                cancellationToken);

        if (usedByAnotherWorkspace)
        {
            return ServiceResult<WorkspaceQuotaDto>.Failure(
                ServiceErrorType.Conflict,
                "Esta sessão de checkout do Stripe já foi utilizada por outra organização.");
        }

        PlanTier effectivePlan = request.Plan;
        string? stripeCustomerId = null;
        string? stripeSubscriptionId = null;

        if (_stripeBillingService != null)
        {
            StripeSessionVerificationResult verification = await _stripeBillingService.VerifyCheckoutSessionAsync(
                trimmedSessionId,
                request.Plan,
                cancellationToken);

            if (!verification.IsValid)
            {
                return ServiceResult<WorkspaceQuotaDto>.Failure(
                    ServiceErrorType.Validation,
                    verification.ErrorMessage ?? "Não foi possível confirmar o pagamento da sessão na Stripe.");
            }

            if (verification.ClientReferenceWorkspaceId.HasValue &&
                verification.ClientReferenceWorkspaceId.Value != id)
            {
                return ServiceResult<WorkspaceQuotaDto>.Failure(
                    ServiceErrorType.Forbidden,
                    "A sessão de pagamento informada pertence a outra organização.",
                    ForbiddenTitle);
            }

            effectivePlan = verification.VerifiedPlan ?? request.Plan;
            stripeCustomerId = verification.CustomerId;
            stripeSubscriptionId = verification.SubscriptionId;
        }

        bool alreadyProcessed = await _dbContext.AuditLogs
            .IgnoreQueryFilters()
            .AnyAsync(a => a.Action == "StripeCheckoutConfirmed" && a.EntityId == trimmedSessionId, cancellationToken);

        try
        {
            Workspace? workspace = await _dbContext.Workspaces
                .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

            if (workspace != null)
            {
                if (!string.IsNullOrWhiteSpace(stripeCustomerId))
                {
                    workspace.StripeCustomerId = stripeCustomerId;
                }

                if (!string.IsNullOrWhiteSpace(stripeSubscriptionId))
                {
                    workspace.StripeSubscriptionId = stripeSubscriptionId;
                }

                workspace.CancelAtPeriodEnd = false;
            }

            WorkspaceQuotaDto updated = await _quotaService.UpdatePlanAsync(id, effectivePlan, cancellationToken);

            if (!alreadyProcessed)
            {
                try
                {
                    await _auditService.LogAsync(
                        id,
                        userId,
                        "StripeCheckoutConfirmed",
                        "StripeSession",
                        trimmedSessionId,
                        $"Pagamento confirmado via Stripe (Sessão: {trimmedSessionId[..Math.Min(18, trimmedSessionId.Length)]}...). Plano ativado: {effectivePlan}.",
                        cancellationToken);
                }
                catch (DbUpdateException)
                {
                    // Idempotência distribuída garantida pelo índice único IX_audit_logs_stripe_idempotency
                }
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

    public async Task<ServiceResult> HandleStripeWebhookAsync(
        string rawPayload,
        string? stripeSignatureHeader,
        CancellationToken cancellationToken = default)
    {
        if (_stripeBillingService == null)
        {
            return ServiceResult.Failure(
                ServiceErrorType.InternalError,
                "Serviço de faturamento Stripe não registrado.");
        }

        StripeWebhookEventResult webhookEvent = _stripeBillingService.ParseAndVerifyWebhookEvent(
            rawPayload,
            stripeSignatureHeader);

        if (!webhookEvent.IsSignatureValid)
        {
            return ServiceResult.Failure(
                ServiceErrorType.Validation,
                webhookEvent.ErrorMessage ?? "Assinatura de webhook inválida.");
        }

        SemaphoreSlim? eventLock = null;
        if (!string.IsNullOrWhiteSpace(webhookEvent.EventId))
        {
            eventLock = WebhookEventLocks.GetOrAdd(webhookEvent.EventId, _ => new SemaphoreSlim(1, 1));
            await eventLock.WaitAsync(cancellationToken);
        }

        try
        {
            if (!string.IsNullOrWhiteSpace(webhookEvent.EventId))
            {
                bool eventAlreadyHandled = await _dbContext.AuditLogs
                    .IgnoreQueryFilters()
                    .AnyAsync(
                        a => a.Action == "StripeWebhookProcessed" && a.EntityId == webhookEvent.EventId,
                        cancellationToken);

                if (eventAlreadyHandled)
                {
                    return ServiceResult.Success();
                }
            }

            Workspace? targetWorkspace = null;

            if (webhookEvent.ClientReferenceWorkspaceId.HasValue)
            {
                Guid refWsId = webhookEvent.ClientReferenceWorkspaceId.Value;
                targetWorkspace = await _dbContext.Workspaces
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.Id == refWsId, cancellationToken);
            }

            if (targetWorkspace == null && !string.IsNullOrWhiteSpace(webhookEvent.SubscriptionId))
            {
                targetWorkspace = await _dbContext.Workspaces
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.StripeSubscriptionId == webhookEvent.SubscriptionId, cancellationToken);
            }

            if (targetWorkspace == null && !string.IsNullOrWhiteSpace(webhookEvent.CustomerId))
            {
                targetWorkspace = await _dbContext.Workspaces
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.StripeCustomerId == webhookEvent.CustomerId, cancellationToken);
            }

            if (targetWorkspace == null)
            {
                return ServiceResult.Success();
            }

            string eventType = webhookEvent.EventType ?? string.Empty;

            if (string.Equals(eventType, "checkout.session.completed", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(eventType, "checkout.session.async_payment_succeeded", StringComparison.OrdinalIgnoreCase))
            {
                bool hasDifferentActiveSub = !string.IsNullOrWhiteSpace(targetWorkspace.StripeSubscriptionId) &&
                    !string.IsNullOrWhiteSpace(webhookEvent.SubscriptionId) &&
                    !string.Equals(targetWorkspace.StripeSubscriptionId, webhookEvent.SubscriptionId, StringComparison.OrdinalIgnoreCase);

                if (!hasDifferentActiveSub)
                {
                    PlanTier targetPlan = webhookEvent.ResolvedPlan ?? PlanTier.Professional;
                    if (!string.IsNullOrWhiteSpace(webhookEvent.CustomerId))
                    {
                        targetWorkspace.StripeCustomerId = webhookEvent.CustomerId;
                    }
                    if (!string.IsNullOrWhiteSpace(webhookEvent.SubscriptionId))
                    {
                        targetWorkspace.StripeSubscriptionId = webhookEvent.SubscriptionId;
                    }
                    targetWorkspace.CancelAtPeriodEnd = false;

                    await _quotaService.UpdatePlanAsync(targetWorkspace.Id, targetPlan, cancellationToken);
                }

                if (!string.IsNullOrWhiteSpace(webhookEvent.SessionId))
                {
                    bool sessionLogged = await _dbContext.AuditLogs
                        .IgnoreQueryFilters()
                        .AnyAsync(
                            a => a.Action == "StripeCheckoutConfirmed" && a.EntityId == webhookEvent.SessionId,
                            cancellationToken);

                    if (!sessionLogged)
                    {
                        try
                        {
                            await _auditService.LogAsync(
                                targetWorkspace.Id,
                                null,
                                "StripeCheckoutConfirmed",
                                "StripeSession",
                                webhookEvent.SessionId,
                                $"Assinatura ativada via Webhook Stripe ({webhookEvent.ResolvedPlan ?? PlanTier.Professional}).",
                                cancellationToken);
                        }
                        catch (DbUpdateException)
                        {
                            // Sessão já registrada concorrentemente
                        }
                    }
                }
            }
            else if (string.Equals(eventType, "customer.subscription.created", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(eventType, "customer.subscription.updated", StringComparison.OrdinalIgnoreCase))
            {
                string status = webhookEvent.SubscriptionStatus ?? "active";
                bool isTerminal = string.Equals(status, "canceled", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(status, "unpaid", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(status, "incomplete_expired", StringComparison.OrdinalIgnoreCase);

                if (isTerminal)
                {
                    if (string.IsNullOrWhiteSpace(targetWorkspace.StripeSubscriptionId) ||
                        string.Equals(targetWorkspace.StripeSubscriptionId, webhookEvent.SubscriptionId, StringComparison.OrdinalIgnoreCase))
                    {
                        targetWorkspace.StripeSubscriptionId = null;
                        targetWorkspace.CancelAtPeriodEnd = false;
                        targetWorkspace.PlanExpiresAtUtc = null;
                        await _quotaService.UpdatePlanAsync(targetWorkspace.Id, PlanTier.Starter, cancellationToken);
                        await DowngradeInheritedSecondaryWorkspacesAsync(targetWorkspace.OwnerUserId, targetWorkspace.Id, cancellationToken);
                    }
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(webhookEvent.CustomerId))
                    {
                        targetWorkspace.StripeCustomerId = webhookEvent.CustomerId;
                    }
                    if (!string.IsNullOrWhiteSpace(webhookEvent.SubscriptionId))
                    {
                        targetWorkspace.StripeSubscriptionId = webhookEvent.SubscriptionId;
                    }
                    if (webhookEvent.CancelAtPeriodEnd.HasValue)
                    {
                        targetWorkspace.CancelAtPeriodEnd = webhookEvent.CancelAtPeriodEnd.Value;
                    }
                    if (webhookEvent.CurrentPeriodEndUtc.HasValue)
                    {
                        targetWorkspace.PlanExpiresAtUtc = webhookEvent.CurrentPeriodEndUtc.Value;
                    }

                    PlanTier syncedPlan = webhookEvent.ResolvedPlan ?? targetWorkspace.Plan;
                    if (syncedPlan != PlanTier.Starter)
                    {
                        await _quotaService.UpdatePlanAsync(targetWorkspace.Id, syncedPlan, cancellationToken);
                    }
                    else
                    {
                        targetWorkspace.UpdatedAt = DateTimeOffset.UtcNow;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                }
            }
            else if (string.Equals(eventType, "customer.subscription.deleted", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(targetWorkspace.StripeSubscriptionId) ||
                    string.IsNullOrWhiteSpace(webhookEvent.SubscriptionId) ||
                    string.Equals(targetWorkspace.StripeSubscriptionId, webhookEvent.SubscriptionId, StringComparison.OrdinalIgnoreCase))
                {
                    targetWorkspace.StripeSubscriptionId = null;
                    targetWorkspace.CancelAtPeriodEnd = false;
                    targetWorkspace.PlanExpiresAtUtc = null;
                    await _quotaService.UpdatePlanAsync(targetWorkspace.Id, PlanTier.Starter, cancellationToken);
                    await DowngradeInheritedSecondaryWorkspacesAsync(targetWorkspace.OwnerUserId, targetWorkspace.Id, cancellationToken);
                }
            }
            else if (string.Equals(eventType, "invoice.payment_succeeded", StringComparison.OrdinalIgnoreCase))
            {
                DateTimeOffset nowUtc = DateTimeOffset.UtcNow;
                targetWorkspace.MonthlyFilesUploaded = 0;
                targetWorkspace.QuotaPeriodStartedAtUtc = nowUtc;
                if (webhookEvent.CurrentPeriodEndUtc.HasValue)
                {
                    targetWorkspace.PlanExpiresAtUtc = webhookEvent.CurrentPeriodEndUtc.Value;
                }
                if (!targetWorkspace.CancelAtPeriodEnd && webhookEvent.ResolvedPlan.HasValue)
                {
                    await _quotaService.UpdatePlanAsync(targetWorkspace.Id, webhookEvent.ResolvedPlan.Value, cancellationToken);
                }
                else
                {
                    targetWorkspace.UpdatedAt = nowUtc;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                await _auditService.LogAsync(
                    targetWorkspace.Id,
                    null,
                    "StripeInvoicePaid",
                    "StripeInvoice",
                    webhookEvent.EventId ?? "invoice_paid",
                    "Renovação / fatura quitada com sucesso na Stripe.",
                    cancellationToken);
            }
            else if (string.Equals(eventType, "invoice.payment_failed", StringComparison.OrdinalIgnoreCase))
            {
                await _auditService.LogAsync(
                    targetWorkspace.Id,
                    null,
                    "StripePaymentFailed",
                    "StripeInvoice",
                    webhookEvent.EventId ?? "invoice_failed",
                    "Cobrança recorrente falhou na Stripe. Assinatura em período de tolerância (Smart Retries ativo).",
                    cancellationToken);
            }
            else if (string.Equals(eventType, "charge.refunded", StringComparison.OrdinalIgnoreCase) && webhookEvent.IsFullRefund)
            {
                if (!string.IsNullOrWhiteSpace(targetWorkspace.StripeSubscriptionId))
                {
                    await _stripeBillingService.CancelSubscriptionAsync(
                        targetWorkspace.StripeSubscriptionId,
                        cancelImmediately: true,
                        cancellationToken: cancellationToken);
                }

                targetWorkspace.StripeSubscriptionId = null;
                targetWorkspace.CancelAtPeriodEnd = false;
                targetWorkspace.PlanExpiresAtUtc = null;
                await _quotaService.UpdatePlanAsync(targetWorkspace.Id, PlanTier.Starter, cancellationToken);
                await DowngradeInheritedSecondaryWorkspacesAsync(targetWorkspace.OwnerUserId, targetWorkspace.Id, cancellationToken);

                await _auditService.LogAsync(
                    targetWorkspace.Id,
                    null,
                    "StripeChargeRefunded",
                    "StripeCharge",
                    webhookEvent.EventId ?? "charge_refunded",
                    "Reembolso integral confirmado na Stripe. Assinatura encerrada e organização retornada ao plano Starter.",
                    cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(webhookEvent.EventId))
            {
                try
                {
                    await _auditService.LogAsync(
                        targetWorkspace.Id,
                        null,
                        "StripeWebhookProcessed",
                        "StripeWebhook",
                        webhookEvent.EventId,
                        $"Evento Stripe '{eventType}' processado com sucesso.",
                        cancellationToken);
                }
                catch (DbUpdateException)
                {
                    // Idempotência distribuída entre múltiplas instâncias garantida por IX_audit_logs_stripe_idempotency
                    return ServiceResult.Success();
                }
            }

            return ServiceResult.Success();
        }
        finally
        {
            if (eventLock != null && !string.IsNullOrWhiteSpace(webhookEvent.EventId))
            {
                eventLock.Release();
                WebhookEventLocks.TryRemove(webhookEvent.EventId, out _);
            }
        }
    }

    private async Task DowngradeInheritedSecondaryWorkspacesAsync(
        Guid? ownerUserId,
        Guid primaryCanceledWorkspaceId,
        CancellationToken cancellationToken)
    {
        if (!ownerUserId.HasValue)
        {
            return;
        }

        Guid uid = ownerUserId.Value;
        bool stillHasPaidEnterprise = await _dbContext.Workspaces
            .IgnoreQueryFilters()
            .AnyAsync(
                w => w.OwnerUserId == uid &&
                     w.Id != primaryCanceledWorkspaceId &&
                     w.Plan == PlanTier.Enterprise &&
                     w.StripeSubscriptionId != null &&
                     w.StripeSubscriptionId != "",
                cancellationToken);

        if (stillHasPaidEnterprise)
        {
            return;
        }

        List<Workspace> secondaryWorkspaces = await _dbContext.Workspaces
            .IgnoreQueryFilters()
            .Where(
                w => w.OwnerUserId == uid &&
                     w.Id != primaryCanceledWorkspaceId &&
                     w.Plan != PlanTier.Starter &&
                     (w.StripeSubscriptionId == null || w.StripeSubscriptionId == ""))
            .ToListAsync(cancellationToken);

        foreach (Workspace secWs in secondaryWorkspaces)
        {
            secWs.Plan = PlanTier.Starter;
            secWs.MonthlyFilesQuota = 5;
            secWs.MaxRowsPerFile = 500;
            secWs.CancelAtPeriodEnd = false;
            secWs.PlanExpiresAtUtc = null;
            secWs.UpdatedAt = DateTimeOffset.UtcNow;
        }

        if (secondaryWorkspaces.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static bool IsAllowedRedirectUrl(string? candidateUrl, string defaultOrigin)
    {
        if (string.IsNullOrWhiteSpace(candidateUrl))
        {
            return false;
        }

        if (!Uri.TryCreate(candidateUrl.Trim(), UriKind.Absolute, out Uri? parsed))
        {
            return false;
        }

        if (parsed.Scheme != Uri.UriSchemeHttps && parsed.Scheme != Uri.UriSchemeHttp)
        {
            return false;
        }

        if (Uri.TryCreate(defaultOrigin, UriKind.Absolute, out Uri? defaultUri) &&
            string.Equals(parsed.Host, defaultUri.Host, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        string host = parsed.Host.ToLowerInvariant();
        return host == "dataconform.com.br" ||
               host == "www.dataconform.com.br" ||
               host == "localhost" ||
               host == "127.0.0.1";
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
            MaxRowsPerFile = workspace.MaxRowsPerFile,
            CancelAtPeriodEnd = workspace.CancelAtPeriodEnd,
            PlanExpiresAtUtc = workspace.PlanExpiresAtUtc,
            HasActiveSubscription = !string.IsNullOrWhiteSpace(workspace.StripeSubscriptionId)
        };
    }
}
