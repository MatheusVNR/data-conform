using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Models;
using DataConform.Application.Projects.Dtos;
using DataConform.Application.Services;
using DataConform.Domain.Entities;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class ProjectServiceTests
{
    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    private static ProjectService CreateProjectService(DataConformDbContext context)
    {
        TenantAccessService tenantAccess = new TenantAccessService(context);
        AuditService auditService = new AuditService(context, tenantAccess);
        return new ProjectService(context, auditService, tenantAccess);
    }

    [Fact]
    public async Task CreateProjectAsync_WhenAuthorized_ShouldCreateProjectAndAudit()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        ProjectService service = CreateProjectService(context);

        Workspace ws = new Workspace { Id = Guid.NewGuid(), Name = "Org A", Slug = "org-a" };
        context.Workspaces.Add(ws);
        await context.SaveChangesAsync();

        Guid userId = Guid.NewGuid();

        ServiceResult<ImportProjectDto> result = await service.CreateProjectAsync(
            ws.Id,
            new CreateImportProjectRequest
            {
                Name = "Migração Clientes SAP",
                Description = "Lote inicial",
                TargetSystem = "SAP Business One"
            },
            userId,
            ws.Id);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("Migração Clientes SAP", result.Data.Name);
        Assert.Equal("SAP Business One", result.Data.TargetSystem);
        Assert.Equal(ws.Id, result.Data.WorkspaceId);
    }

    [Fact]
    public async Task CreateProjectAsync_WhenUnauthorizedTenant_ShouldReturnForbidden()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        ProjectService service = CreateProjectService(context);

        Workspace wsA = new Workspace { Id = Guid.NewGuid(), Name = "Org A", Slug = "org-a" };
        Workspace wsB = new Workspace { Id = Guid.NewGuid(), Name = "Org B", Slug = "org-b" };
        context.Workspaces.AddRange(wsA, wsB);
        await context.SaveChangesAsync();

        Guid userAId = Guid.NewGuid();

        ServiceResult<ImportProjectDto> result = await service.CreateProjectAsync(
            wsB.Id,
            new CreateImportProjectRequest { Name = "Invasão Tenant B" },
            userAId,
            wsA.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task GetProjectsAndDeleteProject_ShouldListAndRemoveCorrectly()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        ProjectService service = CreateProjectService(context);

        Workspace ws = new Workspace { Id = Guid.NewGuid(), Name = "Org Projetos", Slug = "org-proj" };
        context.Workspaces.Add(ws);
        await context.SaveChangesAsync();

        Guid userId = Guid.NewGuid();

        ServiceResult<ImportProjectDto> created = await service.CreateProjectAsync(
            ws.Id,
            new CreateImportProjectRequest { Name = "Projeto Protheus", TargetSystem = "TOTVS Protheus" },
            userId,
            ws.Id);

        Assert.NotNull(created.Data);

        ServiceResult<List<ImportProjectDto>> listResult = await service.GetProjectsByWorkspaceAsync(
            ws.Id,
            userId,
            ws.Id);

        Assert.True(listResult.IsSuccess);
        Assert.NotNull(listResult.Data);
        Assert.Single(listResult.Data);

        ServiceResult deleteResult = await service.DeleteProjectAsync(created.Data.Id, userId);
        Assert.True(deleteResult.IsSuccess);

        ServiceResult<ImportProjectDto> afterDelete = await service.GetProjectByIdAsync(created.Data.Id, userId, ws.Id);
        Assert.False(afterDelete.IsSuccess);
        Assert.Equal(ServiceErrorType.NotFound, afterDelete.ErrorType);
    }
}
