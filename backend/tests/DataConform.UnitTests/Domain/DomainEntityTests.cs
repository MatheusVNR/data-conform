using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using Xunit;

namespace DataConform.UnitTests.Domain;

public class DomainEntityTests
{
    [Fact]
    public void Workspace_ShouldInitializeWithDefaults()
    {
        Workspace workspace = new Workspace
        {
            Name = "Empresa Teste",
            Slug = "empresa-teste"
        };

        Assert.NotEqual(Guid.Empty, workspace.Id);
        Assert.Equal("Empresa Teste", workspace.Name);
        Assert.Equal("empresa-teste", workspace.Slug);
        Assert.True(workspace.CreatedAt <= DateTimeOffset.UtcNow);
        Assert.Null(workspace.UpdatedAt);
        Assert.NotNull(workspace.Projects);
        Assert.Empty(workspace.Projects);
    }

    [Fact]
    public void ImportProject_ShouldLinkToWorkspaceAndFiles()
    {
        Guid workspaceId = Guid.NewGuid();
        ImportProject project = new ImportProject
        {
            WorkspaceId = workspaceId,
            Name = "Importação de Clientes 2026",
            TargetSystem = "SAP"
        };

        Assert.NotEqual(Guid.Empty, project.Id);
        Assert.Equal(workspaceId, project.WorkspaceId);
        Assert.Equal("Importação de Clientes 2026", project.Name);
        Assert.Equal("SAP", project.TargetSystem);
        Assert.Empty(project.Files);
    }

    [Fact]
    public void ImportFile_ShouldDefaultToPendingStatus()
    {
        ImportFile file = new ImportFile
        {
            OriginalFileName = "clientes.xlsx",
            StoredFileName = "uuid-clientes.xlsx",
            ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ByteSize = 1024 * 50
        };

        Assert.Equal(FileStatus.Pending, file.Status);
        Assert.Null(file.ProcessedAt);
        Assert.Empty(file.ValidationIssues);
    }

    [Fact]
    public void ValidationIssue_ShouldCreateWithRequiredAttributes()
    {
        Guid fileId = Guid.NewGuid();
        ValidationIssue issue = new ValidationIssue
        {
            FileId = fileId,
            RowNumber = 12,
            ColumnName = "CNPJ",
            IssueCode = "INVALID_DOCUMENT",
            Message = "CNPJ informado possui dígitos verificadores inválidos",
            Severity = IssueSeverity.Error,
            RawValue = "12.345.678/0001-00"
        };

        Assert.NotEqual(Guid.Empty, issue.Id);
        Assert.Equal(fileId, issue.FileId);
        Assert.Equal(12, issue.RowNumber);
        Assert.Equal("CNPJ", issue.ColumnName);
        Assert.Equal(IssueSeverity.Error, issue.Severity);
        Assert.Equal("INVALID_DOCUMENT", issue.IssueCode);
    }
}
