using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Models;
using DataConform.Application.Services;
using DataConform.Domain.Entities;
using DataConform.Infrastructure.Persistence;
using Xunit;

namespace DataConform.UnitTests.Services;

public class TenantAccessServiceTests
{
    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    [Fact]
    public async Task GetAllowedWorkspaceIdsAsync_Anonymous_ShouldReturnEmpty()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        TenantAccessService service = new TenantAccessService(context);

        HashSet<Guid> allowed = await service.GetAllowedWorkspaceIdsAsync(null, null);

        Assert.Empty(allowed);
    }

    [Fact]
    public async Task GetAllowedWorkspaceIdsAsync_ShouldIncludePrimaryBoundAndCreatedWorkspaces()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        TenantAccessService service = new TenantAccessService(context);

        Workspace primary = new Workspace { Id = Guid.NewGuid(), Name = "Matriz", Slug = "matriz" };
        Workspace created = new Workspace { Id = Guid.NewGuid(), Name = "Filial", Slug = "filial" };
        Workspace foreign = new Workspace { Id = Guid.NewGuid(), Name = "Terceiro", Slug = "terceiro" };
        User user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = primary.Id,
            Email = "u@matriz.com",
            FullName = "Usuário",
            PasswordHash = "hash"
        };

        context.Workspaces.AddRange(primary, created, foreign);
        context.Users.Add(user);
        context.AuditLogs.Add(new AuditLog
        {
            WorkspaceId = created.Id,
            UserId = user.Id,
            Action = "CreateWorkspace",
            EntityName = "Workspace",
            EntityId = created.Id.ToString()
        });
        await context.SaveChangesAsync();

        HashSet<Guid> allowed = await service.GetAllowedWorkspaceIdsAsync(user.Id, primary.Id);

        Assert.Contains(primary.Id, allowed);
        Assert.Contains(created.Id, allowed);
        Assert.DoesNotContain(foreign.Id, allowed);
    }

    [Fact]
    public async Task VerifyWorkspaceAccessAsync_ShouldDistinguishNotFoundFromForbidden()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        TenantAccessService service = new TenantAccessService(context);

        Workspace mine = new Workspace { Id = Guid.NewGuid(), Name = "Minha", Slug = "minha" };
        Workspace other = new Workspace { Id = Guid.NewGuid(), Name = "Outra", Slug = "outra" };
        context.Workspaces.AddRange(mine, other);
        await context.SaveChangesAsync();

        Guid userId = Guid.NewGuid();

        ServiceResult ok = await service.VerifyWorkspaceAccessAsync(userId, mine.Id, mine.Id);
        ServiceResult forbidden = await service.VerifyWorkspaceAccessAsync(userId, mine.Id, other.Id);
        ServiceResult notFound = await service.VerifyWorkspaceAccessAsync(userId, mine.Id, Guid.NewGuid());

        Assert.True(ok.IsSuccess);
        Assert.Equal(ServiceErrorType.Forbidden, forbidden.ErrorType);
        Assert.Equal(ServiceErrorType.NotFound, notFound.ErrorType);
    }

    [Fact]
    public async Task VerifyProjectAndFileAccessAsync_ShouldBlockCrossTenantIdor()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        TenantAccessService service = new TenantAccessService(context);

        Workspace mine = new Workspace { Id = Guid.NewGuid(), Name = "Minha", Slug = "minha" };
        Workspace other = new Workspace { Id = Guid.NewGuid(), Name = "Outra", Slug = "outra" };
        ImportProject foreignProject = new ImportProject { Id = Guid.NewGuid(), WorkspaceId = other.Id, Name = "Alheio" };
        ImportFile foreignFile = new ImportFile
        {
            Id = Guid.NewGuid(),
            ProjectId = foreignProject.Id,
            OriginalFileName = "a.csv",
            StoredFileName = "x.csv",
            ContentType = "text/csv",
            ByteSize = 10
        };

        context.Workspaces.AddRange(mine, other);
        context.ImportProjects.Add(foreignProject);
        context.ImportFiles.Add(foreignFile);
        await context.SaveChangesAsync();

        Guid userId = Guid.NewGuid();

        ServiceResult projectResult = await service.VerifyProjectAccessAsync(userId, mine.Id, foreignProject.Id);
        ServiceResult fileResult = await service.VerifyFileAccessAsync(userId, mine.Id, foreignFile.Id);
        ServiceResult missingFile = await service.VerifyFileAccessAsync(userId, mine.Id, Guid.NewGuid());

        Assert.Equal(ServiceErrorType.Forbidden, projectResult.ErrorType);
        Assert.Equal(ServiceErrorType.Forbidden, fileResult.ErrorType);
        Assert.Equal(ServiceErrorType.NotFound, missingFile.ErrorType);
    }
}
