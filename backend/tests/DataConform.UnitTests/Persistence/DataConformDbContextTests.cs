using Microsoft.EntityFrameworkCore;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;
using Xunit;

namespace DataConform.UnitTests.Persistence;

public class DataConformDbContextTests
{
    private static DataConformDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldPersistWorkspaceWithHierarchy()
    {
        using DataConformDbContext context = CreateInMemoryDbContext();

        Workspace workspace = new Workspace
        {
            Name = "Matriz São Paulo",
            Slug = "matriz-sp"
        };

        ImportProject project = new ImportProject
        {
            Workspace = workspace,
            Name = "Carga Produtos Outubro",
            TargetSystem = "TOTVS Protheus"
        };

        ImportFile file = new ImportFile
        {
            Project = project,
            OriginalFileName = "produtos_v1.csv",
            StoredFileName = "storage-produtos_v1.csv",
            ContentType = "text/csv",
            ByteSize = 2048,
            Status = FileStatus.Processing,
            TotalRows = 100
        };

        ValidationIssue issue = new ValidationIssue
        {
            File = file,
            RowNumber = 5,
            ColumnName = "PrecoUnitario",
            IssueCode = "NEGATIVE_VALUE",
            Message = "Preço unitário não pode ser negativo",
            Severity = IssueSeverity.Error,
            RawValue = "-10.50"
        };

        workspace.Projects.Add(project);
        project.Files.Add(file);
        file.ValidationIssues.Add(issue);

        context.Workspaces.Add(workspace);
        int result = await context.SaveChangesAsync();

        Assert.True(result > 0);

        // Consultar a partir do banco em memória
        Workspace? savedWorkspace = await context.Workspaces
            .Include(w => w.Projects)
                .ThenInclude(p => p.Files)
                    .ThenInclude(f => f.ValidationIssues)
            .FirstOrDefaultAsync(w => w.Slug == "matriz-sp");

        Assert.NotNull(savedWorkspace);
        Assert.Single(savedWorkspace.Projects);

        ImportProject savedProject = savedWorkspace.Projects.First();
        Assert.Equal("Carga Produtos Outubro", savedProject.Name);
        Assert.Single(savedProject.Files);

        ImportFile savedFile = savedProject.Files.First();
        Assert.Equal(FileStatus.Processing, savedFile.Status);
        Assert.Single(savedFile.ValidationIssues);

        ValidationIssue savedIssue = savedFile.ValidationIssues.First();
        Assert.Equal(IssueSeverity.Error, savedIssue.Severity);
        Assert.Equal("NEGATIVE_VALUE", savedIssue.IssueCode);
    }

    [Fact]
    public void RelationalModel_ShouldNotHavePendingModelChanges()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=dataconform_model_check;Username=postgres;Password=postgres",
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(DataConformDbContext).Assembly.FullName);
                })
            .Options;

        using DataConformDbContext context = new DataConformDbContext(options);

        bool hasPendingChanges = context.Database.HasPendingModelChanges();

        Assert.False(
            hasPendingChanges,
            "O modelo EF Core possui alterações pendentes não refletidas em DataConformDbContextModelSnapshot. Execute 'dotnet ef migrations add' antes do deploy.");
    }
}
