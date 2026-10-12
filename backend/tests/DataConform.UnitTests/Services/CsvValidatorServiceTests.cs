using System.Text;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Services;
using DataConform.Domain.Enums;
using Xunit;

namespace DataConform.UnitTests.Services;

public class CsvValidatorServiceTests
{
    private readonly CsvValidatorService _validator = new CsvValidatorService();

    [Fact]
    public async Task ValidateCsvStreamAsync_ValidCsv_ShouldReturnSuccessWithNoIssues()
    {
        string csvContent = "Nome,Email,Documento\nJoão Silva,joao@empresa.com,12345678900\nMaria Santos,maria@empresa.com,98765432100";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(2, result.ValidRows);
        Assert.Equal(0, result.ErrorRows);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_SemicolonDelimited_ShouldDetectDelimiterCorrectly()
    {
        string csvContent = "Nome;Email;Cidade\nCarlos;carlos@teste.com;Curitiba\nAna;ana@teste.com;Joinville";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(2, result.ValidRows);
        Assert.Equal(0, result.ErrorRows);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_MissingRequiredColumn_ShouldReturnRequiredHeaderMissing()
    {
        string csvContent = "Nome,Telefone\nPedro,11999999999";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();
        string[] requiredColumns = new string[] { "Nome", "Email" };

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId, requiredColumns);

        Assert.Contains(result.Issues, i => i.IssueCode == "REQUIRED_HEADER_MISSING" && i.ColumnName == "Email");
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_EmptyRequiredField_ShouldReturnRequiredFieldMissing()
    {
        string csvContent = "Nome,Email\nJoão,joao@teste.com\nCarlos,";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();
        string[] requiredColumns = new string[] { "Nome", "Email" };

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId, requiredColumns);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.IssueCode == "REQUIRED_FIELD_MISSING" && i.RowNumber == 3 && i.ColumnName == "Email");
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_DuplicateRows_ShouldReturnDuplicateRowWarning()
    {
        string csvContent = "Codigo,Descricao\n101,Produto A\n101,Produto A";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.IssueCode == "DUPLICATE_ROW" && i.RowNumber == 3 && i.Severity == IssueSeverity.Warning);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_EmptyFile_ShouldReturnEmptyFileIssue()
    {
        string csvContent = "";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(0, result.TotalRows);
        Assert.Single(result.Issues);
        Assert.Equal("EMPTY_FILE", result.Issues.First().IssueCode);
    }
}
