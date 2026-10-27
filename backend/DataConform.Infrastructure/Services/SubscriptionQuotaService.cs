using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Infrastructure.Services;

public class SubscriptionQuotaService : ISubscriptionQuotaService
{
    private readonly IApplicationDbContext _context;

    public SubscriptionQuotaService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QuotaCheckResult> CheckUploadQuotaAsync(Guid workspaceId, int rowCount, CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace == null)
        {
            return QuotaCheckResult.Denied("Organização (Workspace) não encontrada.");
        }

        await EnsureMonthlyQuotaPeriodCurrentAsync(workspace, cancellationToken);

        if (workspace.MonthlyFilesUploaded >= workspace.MonthlyFilesQuota)
        {
            return QuotaCheckResult.Denied(
                $"Limite mensal de envio de arquivos atingido ({workspace.MonthlyFilesUploaded}/{workspace.MonthlyFilesQuota} arquivos). Faça upgrade do seu plano para continuar enviando.");
        }

        if (rowCount > workspace.MaxRowsPerFile)
        {
            return QuotaCheckResult.Denied(
                $"O arquivo contém {rowCount:N0} linhas, excedendo o teto de {workspace.MaxRowsPerFile:N0} linhas por arquivo do plano atual ({workspace.Plan}). Para validar bases com esse volume, faça upgrade para o plano Professional ou Enterprise.");
        }

        return QuotaCheckResult.Success();
    }

    public async Task IncrementFilesUploadedAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        try
        {
            DateTimeOffset now = DateTimeOffset.UtcNow;
            int affectedRows = await _context.Workspaces
                .Where(w => w.Id == workspaceId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(w => w.MonthlyFilesUploaded, w => w.MonthlyFilesUploaded + 1)
                    .SetProperty(w => w.UpdatedAt, now),
                    cancellationToken);

            if (affectedRows > 0)
            {
                return;
            }
        }
        catch (InvalidOperationException)
        {
            // Fallback for providers that do not support ExecuteUpdate (such as InMemoryDatabaseProvider)
            Workspace? workspace = await _context.Workspaces
                .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

            if (workspace != null)
            {
                workspace.MonthlyFilesUploaded += 1;
                workspace.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
    }

    public async Task<WorkspaceQuotaDto> GetWorkspaceQuotaAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID '{workspaceId}' was not found.");
        }

        await EnsureMonthlyQuotaPeriodCurrentAsync(workspace, cancellationToken);

        double usagePercentage = workspace.MonthlyFilesQuota > 0
            ? Math.Round(((double)workspace.MonthlyFilesUploaded / workspace.MonthlyFilesQuota) * 100.0, 1)
            : 0;

        return new WorkspaceQuotaDto
        {
            WorkspaceId = workspace.Id,
            Plan = workspace.Plan,
            MonthlyFilesUploaded = workspace.MonthlyFilesUploaded,
            MonthlyFilesQuota = workspace.MonthlyFilesQuota,
            MaxRowsPerFile = workspace.MaxRowsPerFile,
            UsagePercentage = usagePercentage
        };
    }

    public async Task<WorkspaceQuotaDto> UpdatePlanAsync(Guid workspaceId, PlanTier newPlan, CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID '{workspaceId}' was not found.");
        }

        workspace.Plan = newPlan;
        workspace.UpdatedAt = DateTimeOffset.UtcNow;

        switch (newPlan)
        {
            case PlanTier.Professional:
                workspace.MonthlyFilesQuota = 500;
                workspace.MaxRowsPerFile = 15_000;
                break;
            case PlanTier.Enterprise:
                workspace.MonthlyFilesQuota = 10_000;
                workspace.MaxRowsPerFile = 1_000_000;
                break;
            case PlanTier.Starter:
            default:
                workspace.MonthlyFilesQuota = 5;
                workspace.MaxRowsPerFile = 500;
                break;
        }

        await _context.SaveChangesAsync(cancellationToken);

        double usagePercentage = workspace.MonthlyFilesQuota > 0
            ? Math.Round(((double)workspace.MonthlyFilesUploaded / workspace.MonthlyFilesQuota) * 100.0, 1)
            : 0;

        return new WorkspaceQuotaDto
        {
            WorkspaceId = workspace.Id,
            Plan = workspace.Plan,
            MonthlyFilesUploaded = workspace.MonthlyFilesUploaded,
            MonthlyFilesQuota = workspace.MonthlyFilesQuota,
            MaxRowsPerFile = workspace.MaxRowsPerFile,
            UsagePercentage = usagePercentage
        };
    }

    private async Task EnsureMonthlyQuotaPeriodCurrentAsync(Workspace workspace, CancellationToken cancellationToken)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset referenceDate = workspace.UpdatedAt ?? workspace.CreatedAt;

        bool isPreviousMonth = referenceDate.UtcDateTime.Year < now.UtcDateTime.Year ||
            (referenceDate.UtcDateTime.Year == now.UtcDateTime.Year && referenceDate.UtcDateTime.Month < now.UtcDateTime.Month);

        if (isPreviousMonth && workspace.MonthlyFilesUploaded > 0)
        {
            workspace.MonthlyFilesUploaded = 0;
            workspace.UpdatedAt = now;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
