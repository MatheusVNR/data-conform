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
        string csvContent = "Nome,Email,Documento\nJoão Silva,joao@empresa.com,52998224725\nMaria Santos,maria@empresa.com,12345678000195";
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

    [Fact]
    public async Task ValidateCsvStreamAsync_SemanticErpRules_ShouldDetectInvalidEmailDocumentAmountAndDate()
    {
        string csvContent = "codigo,cnpj_cpf,email,valor_limite,data_vencimento\n" +
                            "1001,12.345.678/0001-95,contato@empresa.com.br,15000.00,2026-12-31\n" +
                            "1002,12.345.678/0001-12,email-invalido,-450.00,data-errada";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.IssueCode == "INVALID_DOCUMENT_FORMAT" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.IssueCode == "INVALID_EMAIL_FORMAT" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.IssueCode == "NEGATIVE_AMOUNT_NOT_ALLOWED" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.IssueCode == "INVALID_DATE_FORMAT" && i.RowNumber == 3);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_Rfc4180QuotedFieldsWithCommas_ShouldNotSplitInsideQuotes()
    {
        string csvContent = "A1_COD,A1_NOME,A1_CGC,A1_EMAIL,A1_LC\n" +
                            "000101,\"Alpha Tecnologia, Consultoria e Servicos LTDA\",12.345.678/0001-95,fiscal@alphatech.com.br,\"R$ 85.000,50\"";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(1, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(0, result.ErrorRows);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_ErpSpecificDictionaries_ShouldValidateProtheusAndSapColumns()
    {
        string csvContent = "CardCode,CardName,LicTradNum,E_Mail,CreditLine\n" +
                            "C0001,Empresa Valida SA,11.222.333/0001-81,fin@empresa.com.br,50000.00\n" +
                            "C0002,Empresa Com Digito Verificador Falso,11.222.333/0001-99,email_sem_arroba,-100.00";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "LicTradNum" && i.IssueCode == "INVALID_DOCUMENT_FORMAT");
        Assert.Contains(result.Issues, i => i.ColumnName == "E_Mail" && i.IssueCode == "INVALID_EMAIL_FORMAT");
        Assert.Contains(result.Issues, i => i.ColumnName == "CreditLine" && i.IssueCode == "NEGATIVE_AMOUNT_NOT_ALLOWED");
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_CorruptedHeaderEncoding_ShouldReportEncodingCorruptionOnRow1()
    {
        byte[] latin1Bytes = Encoding.Latin1.GetBytes("Código,Razão_Social\n1001,Empresa Teste\n");
        using MemoryStream stream = new MemoryStream(latin1Bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Contains(result.Issues, i => i.IssueCode == "ENCODING_CORRUPTION" && i.RowNumber == 1);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_BrazilianUfRules_ShouldValidateValidUfsAndRejectInvalid()
    {
        string csvContent = "A1_COD,A1_NOME,A1_EST,UF\n" +
                            "001,Cliente SP,SP,PR\n" +
                            "002,Cliente Invalido,XX,Sao Paulo";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "A1_EST" && i.IssueCode == "INVALID_UF_CODE" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.ColumnName == "UF" && i.IssueCode == "INVALID_UF_CODE" && i.RowNumber == 3);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_BrazilianCepRules_ShouldValidate8DigitsAndRejectInvalid()
    {
        string csvContent = "codigo,cep,zipcode\n" +
                            "101,01001-000,80020100\n" +
                            "102,1234,00000000";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "cep" && i.IssueCode == "INVALID_CEP_FORMAT" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.ColumnName == "zipcode" && i.IssueCode == "INVALID_CEP_FORMAT" && i.RowNumber == 3);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_NcmProductRules_ShouldValidate8DigitsAndRejectInvalid()
    {
        string csvContent = "B1_COD,B1_DESC,B1_POSIPI,NCM\n" +
                            "PRD01,Computador Desktop,8471.30.12,84713012\n" +
                            "PRD02,Monitor Led,8471,123";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "B1_POSIPI" && i.IssueCode == "INVALID_NCM_FORMAT" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.ColumnName == "NCM" && i.IssueCode == "INVALID_NCM_FORMAT" && i.RowNumber == 3);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_PhoneRules_ShouldValidatePhoneWithDddAndRejectInvalid()
    {
        string csvContent = "Nome,Telefone,A1_TEL\n" +
                            "Joao Silva,(11) 98765-4321,4132221234\n" +
                            "Maria Erro,987654321,0012345678";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "Telefone" && i.IssueCode == "INVALID_PHONE_FORMAT" && i.RowNumber == 3);
        Assert.Contains(result.Issues, i => i.ColumnName == "A1_TEL" && i.IssueCode == "INVALID_PHONE_FORMAT" && i.RowNumber == 3);
    }

    [Fact]
    public async Task ValidateCsvStreamAsync_ProtheusSuppliersAndProducts_ShouldValidateA2AndB1Columns()
    {
        string csvContent = "A2_COD,A2_NOME,A2_CGC,A2_LC,A2_EST\n" +
                            "FOR01,Distribuidora Beta,12.345.678/0001-95,150000.00,MG\n" +
                            "FOR02,Fornecedor Invalido,12.345.678/0001-00,-500.00,ZZ";
        byte[] bytes = Encoding.UTF8.GetBytes(csvContent);
        using MemoryStream stream = new MemoryStream(bytes);
        Guid fileId = Guid.NewGuid();

        FileValidationResult result = await _validator.ValidateCsvStreamAsync(stream, fileId);

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.ErrorRows);
        Assert.Contains(result.Issues, i => i.ColumnName == "A2_CGC" && i.IssueCode == "INVALID_DOCUMENT_FORMAT");
        Assert.Contains(result.Issues, i => i.ColumnName == "A2_LC" && i.IssueCode == "NEGATIVE_AMOUNT_NOT_ALLOWED");
        Assert.Contains(result.Issues, i => i.ColumnName == "A2_EST" && i.IssueCode == "INVALID_UF_CODE");
    }
}
