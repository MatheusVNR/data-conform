using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;

namespace DataConform.UnitTests.Services;

public class SubscriptionQuotaServiceTests
{
    private DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    [Fact]
    public async Task CheckUploadQuotaAsync_WhenWithinLimits_ShouldReturnAllowed()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        SubscriptionQuotaService service = new SubscriptionQuotaService(context);

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Starter Workspace",
            Slug = "starter-workspace",
            Plan = PlanTier.Starter,
            MonthlyFilesUploaded = 5,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        context.Workspaces.Add(workspace);
        await context.SaveChangesAsync();

        QuotaCheckResult result = await service.CheckUploadQuotaAsync(workspace.Id, 500);

        Assert.True(result.IsAllowed);
        Assert.Null(result.Reason);
    }

    [Fact]
    public async Task CheckUploadQuotaAsync_WhenMonthlyQuotaExceeded_ShouldReturnDenied()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        SubscriptionQuotaService service = new SubscriptionQuotaService(context);

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Starter Workspace",
            Slug = "starter-workspace",
            Plan = PlanTier.Starter,
            MonthlyFilesUploaded = 20,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        context.Workspaces.Add(workspace);
        await context.SaveChangesAsync();

        QuotaCheckResult result = await service.CheckUploadQuotaAsync(workspace.Id, 100);

        Assert.False(result.IsAllowed);
        Assert.Contains("Limite mensal de envio", result.Reason);
    }

    [Fact]
    public async Task CheckUploadQuotaAsync_WhenRowCountExceedsLimit_ShouldReturnDenied()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        SubscriptionQuotaService service = new SubscriptionQuotaService(context);

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Starter Workspace",
            Slug = "starter-workspace",
            Plan = PlanTier.Starter,
            MonthlyFilesUploaded = 2,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        context.Workspaces.Add(workspace);
        await context.SaveChangesAsync();

        QuotaCheckResult result = await service.CheckUploadQuotaAsync(workspace.Id, 2500);

        Assert.False(result.IsAllowed);
        Assert.Contains("excedendo o teto", result.Reason);
    }

    [Fact]
    public async Task UpdatePlanAsync_ShouldUpgradeQuotasCorrectly()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        SubscriptionQuotaService service = new SubscriptionQuotaService(context);

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Upgradeable Workspace",
            Slug = "upgradeable-workspace",
            Plan = PlanTier.Starter,
            MonthlyFilesUploaded = 10,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };

        context.Workspaces.Add(workspace);
        await context.SaveChangesAsync();

        WorkspaceQuotaDto upgraded = await service.UpdatePlanAsync(workspace.Id, PlanTier.Professional);

        Assert.Equal(PlanTier.Professional, upgraded.Plan);
        Assert.Equal(500, upgraded.MonthlyFilesQuota);
        Assert.Equal(50_000, upgraded.MaxRowsPerFile);
        Assert.Equal(2.0, upgraded.UsagePercentage);

        Workspace? reloaded = await context.Workspaces.FirstOrDefaultAsync(w => w.Id == workspace.Id);
        Assert.NotNull(reloaded);
        Assert.Equal(PlanTier.Professional, reloaded.Plan);
        Assert.Equal(500, reloaded.MonthlyFilesQuota);
        Assert.Equal(50_000, reloaded.MaxRowsPerFile);
    }
}
