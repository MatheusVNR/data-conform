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
            return QuotaCheckResult.Denied("Workspace not found.");
        }

        if (workspace.MonthlyFilesUploaded >= workspace.MonthlyFilesQuota)
        {
            return QuotaCheckResult.Denied(
                $"Monthly file upload limit reached ({workspace.MonthlyFilesUploaded}/{workspace.MonthlyFilesQuota} files). Upgrade your plan to continue uploading.");
        }

        if (rowCount > workspace.MaxRowsPerFile)
        {
            return QuotaCheckResult.Denied(
                $"File contains {rowCount} rows, exceeding your plan's limit of {workspace.MaxRowsPerFile} rows per file. Upgrade your plan to validate larger datasets.");
        }

        return QuotaCheckResult.Success();
    }

    public async Task IncrementFilesUploadedAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        Workspace? workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace != null)
        {
            workspace.MonthlyFilesUploaded += 1;
            workspace.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
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
                workspace.MaxRowsPerFile = 50_000;
                break;
            case PlanTier.Enterprise:
                workspace.MonthlyFilesQuota = 10_000;
                workspace.MaxRowsPerFile = 1_000_000;
                break;
            case PlanTier.Starter:
            default:
                workspace.MonthlyFilesQuota = 20;
                workspace.MaxRowsPerFile = 1_000;
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
}
