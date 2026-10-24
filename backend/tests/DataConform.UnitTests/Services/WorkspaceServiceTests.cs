using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Models;
using DataConform.Application.Services;
using DataConform.Application.Workspaces.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class WorkspaceServiceTests
{
    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    private static WorkspaceService CreateWorkspaceService(DataConformDbContext context)
    {
        TenantAccessService tenantAccess = new TenantAccessService(context);
        SubscriptionQuotaService quotaService = new SubscriptionQuotaService(context);
        AuditService auditService = new AuditService(context, tenantAccess);

        return new WorkspaceService(context, quotaService, auditService, tenantAccess);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_WithValidSlug_ShouldCreateStarterWorkspaceAndAudit()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);
        Guid userId = Guid.NewGuid();

        ServiceResult<WorkspaceDto> result = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Filial Sul", Slug = "filial-sul" },
            userId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("Filial Sul", result.Data.Name);
        Assert.Equal("filial-sul", result.Data.Slug);
        Assert.Equal(PlanTier.Starter, result.Data.Plan);
        Assert.Equal(20, result.Data.MonthlyFilesQuota);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_WithDuplicateSlug_ShouldReturnConflict()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);
        Guid userId = Guid.NewGuid();

        await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Filial Norte", Slug = "filial-norte" },
            userId);

        ServiceResult<WorkspaceDto> duplicateResult = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Outra Filial", Slug = "FILIAL-NORTE" },
            userId);

        Assert.False(duplicateResult.IsSuccess);
        Assert.Equal(ServiceErrorType.Conflict, duplicateResult.ErrorType);
    }

    [Fact]
    public async Task GetWorkspacesAsync_ShouldEnforceStrictMultiTenantIsolation()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);

        Guid userAId = Guid.NewGuid();
        Guid userBId = Guid.NewGuid();

        ServiceResult<WorkspaceDto> wsA = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Tenant A", Slug = "tenant-a" },
            userAId);

        ServiceResult<WorkspaceDto> wsB = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Tenant B", Slug = "tenant-b" },
            userBId);

        Assert.NotNull(wsA.Data);
        Assert.NotNull(wsB.Data);

        List<WorkspaceDto> visibleToA = await service.GetWorkspacesAsync(userAId, wsA.Data.Id);
        Assert.Single(visibleToA);
        Assert.Equal("tenant-a", visibleToA[0].Slug);

        List<WorkspaceDto> visibleToAnonymous = await service.GetWorkspacesAsync(null, null);
        Assert.Empty(visibleToAnonymous);
    }

    [Fact]
    public async Task DeleteWorkspaceAsync_WhenBoundToUser_ShouldReturnValidationFailure()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);

        Workspace primaryWs = new Workspace { Id = Guid.NewGuid(), Name = "Matriz", Slug = "matriz" };
        User boundUser = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = primaryWs.Id,
            Email = "owner@matriz.com",
            FullName = "Owner",
            PasswordHash = "hash"
        };

        context.Workspaces.Add(primaryWs);
        context.Users.Add(boundUser);
        await context.SaveChangesAsync();

        ServiceResult deleteBoundResult = await service.DeleteWorkspaceAsync(primaryWs.Id);
        Assert.False(deleteBoundResult.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, deleteBoundResult.ErrorType);

        Workspace secondaryWs = new Workspace { Id = Guid.NewGuid(), Name = "Filial", Slug = "filial" };
        context.Workspaces.Add(secondaryWs);
        await context.SaveChangesAsync();

        ServiceResult deleteSecondaryResult = await service.DeleteWorkspaceAsync(secondaryWs.Id);
        Assert.True(deleteSecondaryResult.IsSuccess);
    }

    [Fact]
    public async Task ConfirmStripeCheckoutAsync_WithValidSessionId_ShouldUpgradePlanAndEnforceIdempotency()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);
        Guid userId = Guid.NewGuid();

        ServiceResult<WorkspaceDto> created = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Corp Checkout", Slug = "corp-checkout" },
            userId);

        Assert.NotNull(created.Data);
        Guid workspaceId = created.Data.Id;
        string validSessionId = "cs_test_a1b2c3d4e5f6g7h8i9j0";

        ConfirmCheckoutRequest checkoutReq = new ConfirmCheckoutRequest
        {
            SessionId = validSessionId,
            Plan = PlanTier.Enterprise
        };

        ServiceResult<WorkspaceQuotaDto> firstConfirm = await service.ConfirmStripeCheckoutAsync(
            workspaceId,
            checkoutReq,
            userId,
            workspaceId);

        Assert.True(firstConfirm.IsSuccess);
        Assert.Equal(PlanTier.Enterprise, firstConfirm.Data?.Plan);
        Assert.Equal(10_000, firstConfirm.Data?.MonthlyFilesQuota);

        // Segunda chamada com o mesmo session_id não deve duplicar log de auditoria
        ServiceResult<WorkspaceQuotaDto> secondConfirm = await service.ConfirmStripeCheckoutAsync(
            workspaceId,
            checkoutReq,
            userId,
            workspaceId);

        Assert.True(secondConfirm.IsSuccess);
        int checkoutAuditCount = await context.AuditLogs.CountAsync(
            a => a.Action == "StripeCheckoutConfirmed" && a.EntityId == validSessionId);
        Assert.Equal(1, checkoutAuditCount);
    }

    [Fact]
    public async Task ChangeWorkspacePlanAsync_WithoutStripeForPaidPlans_ShouldRejectAndAllowStarterDowngrade()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        WorkspaceService service = CreateWorkspaceService(context);
        Guid userId = Guid.NewGuid();

        ServiceResult<WorkspaceDto> created = await service.CreateWorkspaceAsync(
            new CreateWorkspaceRequest { Name = "Downgrade Test", Slug = "downgrade-test" },
            userId);

        Assert.NotNull(created.Data);
        Guid wsId = created.Data.Id;

        ServiceResult<WorkspaceQuotaDto> directUpgradeAttempt = await service.ChangeWorkspacePlanAsync(
            wsId,
            new UpdatePlanRequest { Plan = PlanTier.Professional },
            userId,
            wsId);

        Assert.False(directUpgradeAttempt.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, directUpgradeAttempt.ErrorType);

        ServiceResult<WorkspaceQuotaDto> downgradeToStarter = await service.ChangeWorkspacePlanAsync(
            wsId,
            new UpdatePlanRequest { Plan = PlanTier.Starter, Reason = "Volume baixo" },
            userId,
            wsId);

        Assert.True(downgradeToStarter.IsSuccess);
        Assert.Equal(PlanTier.Starter, downgradeToStarter.Data?.Plan);
    }
}
