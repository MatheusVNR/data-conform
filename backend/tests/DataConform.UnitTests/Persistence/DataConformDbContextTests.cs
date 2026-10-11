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
        var options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldPersistWorkspaceWithHierarchy()
    {
        using var context = CreateInMemoryDbContext();

        var workspace = new Workspace
        {
            Name = "Matriz São Paulo",
            Slug = "matriz-sp"
        };

        var project = new ImportProject
        {
            Workspace = workspace,
            Name = "Carga Produtos Outubro",
            TargetSystem = "TOTVS Protheus"
        };

        var file = new ImportFile
        {
            Project = project,
            OriginalFileName = "produtos_v1.csv",
            StoredFileName = "storage-produtos_v1.csv",
            ContentType = "text/csv",
            ByteSize = 2048,
            Status = FileStatus.Processing,
            TotalRows = 100
        };

        var issue = new ValidationIssue
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
        var result = await context.SaveChangesAsync();

        Assert.True(result > 0);

        // Consultar a partir do banco em memória
        var savedWorkspace = await context.Workspaces
            .Include(w => w.Projects)
                .ThenInclude(p => p.Files)
                    .ThenInclude(f => f.ValidationIssues)
            .FirstOrDefaultAsync(w => w.Slug == "matriz-sp");

        Assert.NotNull(savedWorkspace);
        Assert.Single(savedWorkspace.Projects);

        var savedProject = savedWorkspace.Projects.First();
        Assert.Equal("Carga Produtos Outubro", savedProject.Name);
        Assert.Single(savedProject.Files);

        var savedFile = savedProject.Files.First();
        Assert.Equal(FileStatus.Processing, savedFile.Status);
        Assert.Single(savedFile.ValidationIssues);

        var savedIssue = savedFile.ValidationIssues.First();
        Assert.Equal(IssueSeverity.Error, savedIssue.Severity);
        Assert.Equal("NEGATIVE_VALUE", savedIssue.IssueCode);
    }
}
