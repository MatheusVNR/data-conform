using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Models;
using DataConform.Application.Files.Dtos;
using DataConform.Application.Services;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class FileServiceTests : IDisposable
{
    private readonly string _tempStoragePath;

    public FileServiceTests()
    {
        _tempStoragePath = Path.Combine(Path.GetTempPath(), "dataconform_filesvc_test_" + Guid.NewGuid().ToString("N"));
    }

    private DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    private FileService CreateFileService(DataConformDbContext context)
    {
        Dictionary<string, string?> settings = new Dictionary<string, string?>
        {
            { "FileStorage:BasePath", _tempStoragePath }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        LocalFileStorageService storage = new LocalFileStorageService(config);
        CsvValidatorService validator = new CsvValidatorService();
        SubscriptionQuotaService quota = new SubscriptionQuotaService(context);
        TenantAccessService tenantAccess = new TenantAccessService(context);
        AuditService audit = new AuditService(context, tenantAccess);

        return new FileService(context, storage, validator, quota, audit, tenantAccess);
    }

    [Fact]
    public async Task UploadAndValidateFileAsync_EndToEnd_ShouldCountRowsPersistIssuesAndGenerateReport()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FileService fileService = CreateFileService(context);

        Workspace ws = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Org Upload",
            Slug = "org-upload",
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };
        ImportProject proj = new ImportProject
        {
            Id = Guid.NewGuid(),
            WorkspaceId = ws.Id,
            Workspace = ws,
            Name = "Carga Clientes",
            TargetSystem = "TOTVS Protheus"
        };

        context.Workspaces.Add(ws);
        context.ImportProjects.Add(proj);
        await context.SaveChangesAsync();

        string csv = "A1_COD,A1_NOME,A1_CGC,A1_EMAIL\n" +
                     "001,Empresa Valida LTDA,12.345.678/0001-95,fiscal@valida.com.br\n" +
                     "002,Empresa Invalida SA,12.345.678/0001-00,email-invalido";
        byte[] csvBytes = Encoding.UTF8.GetBytes(csv);
        using MemoryStream uploadStream = new MemoryStream(csvBytes);

        Guid userId = Guid.NewGuid();

        ServiceResult<ImportFileDto> uploadResult = await fileService.UploadFileAsync(
            proj.Id,
            "clientes_sa1.csv",
            "text/csv",
            csvBytes.Length,
            uploadStream,
            userId,
            ws.Id);

        Assert.True(uploadResult.IsSuccess);
        Assert.NotNull(uploadResult.Data);
        Assert.Equal(2, uploadResult.Data.TotalRows);
        Assert.Equal(FileStatus.Pending, uploadResult.Data.Status);

        ServiceResult<ValidationReportDto> validateResult = await fileService.ValidateFileAsync(
            uploadResult.Data.Id,
            "A1_COD,A1_NOME,A1_CGC",
            userId,
            ws.Id);

        Assert.True(validateResult.IsSuccess);
        Assert.NotNull(validateResult.Data);
        Assert.Equal(FileStatus.Completed, validateResult.Data.Status);
        Assert.Equal(2, validateResult.Data.TotalRows);
        Assert.Equal(1, validateResult.Data.ValidRows);
        Assert.Equal(1, validateResult.Data.ErrorRows);
        Assert.Equal(2, validateResult.Data.Issues.Count);

        ServiceResult<ValidationReportDto> reportResult = await fileService.GetValidationReportAsync(
            uploadResult.Data.Id,
            userId,
            ws.Id);

        Assert.True(reportResult.IsSuccess);
        Assert.Equal(2, reportResult.Data?.Issues.Count);
    }

    [Fact]
    public async Task UploadFileAsync_WithInvalidExtension_ShouldReturnValidationFailure()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FileService fileService = CreateFileService(context);

        byte[] dummyBytes = Encoding.UTF8.GetBytes("conteudo");
        using MemoryStream stream = new MemoryStream(dummyBytes);

        ServiceResult<ImportFileDto> result = await fileService.UploadFileAsync(
            Guid.NewGuid(),
            "malware.exe",
            "application/octet-stream",
            dummyBytes.Length,
            stream,
            Guid.NewGuid(),
            Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task UploadFileAsync_DisguisedBinaryExecutable_ShouldRejectWithValidationFailure()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FileService fileService = CreateFileService(context);

        Workspace ws = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Security Org",
            Slug = "security-org",
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };
        ImportProject proj = new ImportProject
        {
            Id = Guid.NewGuid(),
            WorkspaceId = ws.Id,
            Workspace = ws,
            Name = "Security Project",
            TargetSystem = "TOTVS Protheus"
        };
        context.Workspaces.Add(ws);
        context.ImportProjects.Add(proj);
        await context.SaveChangesAsync();

        byte[] fakeExe = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 };
        using MemoryStream stream = new MemoryStream(fakeExe);

        ServiceResult<ImportFileDto> result = await fileService.UploadFileAsync(
            proj.Id,
            "disguised.csv",
            "text/csv",
            fakeExe.Length,
            stream,
            Guid.NewGuid(),
            ws.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Contains("binário ou executável", result.ErrorMessage);
    }

    [Fact]
    public async Task ValidateFileAsync_DangerousCsvFormulaRawValues_ShouldSanitizeFormulas()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FileService fileService = CreateFileService(context);

        Workspace ws = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Sanitize Org",
            Slug = "sanitize-org",
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000
        };
        ImportProject proj = new ImportProject
        {
            Id = Guid.NewGuid(),
            WorkspaceId = ws.Id,
            Workspace = ws,
            Name = "Sanitize Proj",
            TargetSystem = "TOTVS Protheus"
        };
        context.Workspaces.Add(ws);
        context.ImportProjects.Add(proj);
        await context.SaveChangesAsync();

        string maliciousCsv = "A1_COD,A1_NOME,A1_CGC,A1_EMAIL\n" +
                              "001,Empresa Normal,12.345.678/0001-95,test@example.com\n" +
                              "002,=cmd|'/C calc'!A0,12.345.678/0001-00,bad-email";
        byte[] csvBytes = Encoding.UTF8.GetBytes(maliciousCsv);
        using MemoryStream uploadStream = new MemoryStream(csvBytes);
        Guid userId = Guid.NewGuid();

        ServiceResult<ImportFileDto> uploadResult = await fileService.UploadFileAsync(
            proj.Id,
            "formula_injection.csv",
            "text/csv",
            csvBytes.Length,
            uploadStream,
            userId,
            ws.Id);

        Assert.True(uploadResult.IsSuccess);

        ServiceResult<ValidationReportDto> validateResult = await fileService.ValidateFileAsync(
            uploadResult.Data!.Id,
            null,
            userId,
            ws.Id);

        Assert.True(validateResult.IsSuccess);
        ValidationIssueDto? formulaIssue = validateResult.Data?.Issues.FirstOrDefault(i => i.IssueCode == "INVALID_DOCUMENT_FORMAT");
        Assert.NotNull(formulaIssue);
        Assert.False(formulaIssue.RawValue?.StartsWith("="));
    }

    private sealed class CancellingValidatorStub : DataConform.Application.Common.Interfaces.ICsvValidatorService
    {
        public Task<DataConform.Application.Common.Interfaces.FileValidationResult> ValidateCsvStreamAsync(
            Stream csvStream,
            Guid fileId,
            IReadOnlyCollection<string>? requiredColumns = null,
            CancellationToken cancellationToken = default)
        {
            throw new OperationCanceledException("Requisição abortada pelo cliente.");
        }
    }

    [Fact]
    public async Task UploadFileAsync_ShouldEnforcePlanByteSizeLimitsAndBlockCrossTenantDelete()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FileService fileService = CreateFileService(context);

        Guid ownerA = Guid.NewGuid();
        Guid attackerB = Guid.NewGuid();
        Workspace starterWs = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Starter Size",
            Slug = "starter-size",
            OwnerUserId = ownerA,
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 5,
            MaxRowsPerFile = 500
        };
        Workspace otherWs = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Other Org",
            Slug = "other-org",
            OwnerUserId = attackerB,
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 5,
            MaxRowsPerFile = 500
        };
        ImportProject proj = new ImportProject
        {
            Id = Guid.NewGuid(),
            WorkspaceId = starterWs.Id,
            Workspace = starterWs,
            Name = "Projeto Starter",
            TargetSystem = "TOTVS Protheus"
        };
        context.Workspaces.AddRange(starterWs, otherWs);
        context.ImportProjects.Add(proj);
        await context.SaveChangesAsync();

        // Starter (> 5 MB) deve ser rejeitado antes mesmo de gravar em disco
        long overFiveMb = (5L * 1024L * 1024L) + 1024L;
        using MemoryStream smallBuffer = new MemoryStream(Encoding.UTF8.GetBytes("A1_COD,A1_NOME\n001,Teste"));
        ServiceResult<ImportFileDto> oversizeStarter = await fileService.UploadFileAsync(
            proj.Id,
            "lote_6mb.csv",
            "text/csv",
            overFiveMb,
            smallBuffer,
            ownerA,
            starterWs.Id);

        Assert.False(oversizeStarter.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, oversizeStarter.ErrorType);
        Assert.Contains("5 MB", oversizeStarter.ErrorMessage);

        // Upload válido + tentativa de DeleteFileAsync por outro tenant
        byte[] okBytes = Encoding.UTF8.GetBytes("A1_COD,A1_NOME\n001,Cliente Legitimo");
        using MemoryStream okStream = new MemoryStream(okBytes);
        ServiceResult<ImportFileDto> validUpload = await fileService.UploadFileAsync(
            proj.Id,
            "legitimo.csv",
            "text/csv",
            okBytes.Length,
            okStream,
            ownerA,
            starterWs.Id);

        Assert.True(validUpload.IsSuccess);
        Assert.NotNull(validUpload.Data);

        ServiceResult crossTenantDelete = await fileService.DeleteFileAsync(
            validUpload.Data.Id,
            attackerB,
            otherWs.Id);
        Assert.False(crossTenantDelete.IsSuccess);
        Assert.Equal(ServiceErrorType.Forbidden, crossTenantDelete.ErrorType);
    }

    [Fact]
    public async Task ValidateFileAsync_WhenCancelledOrMissingFromEphemeralDisk_ShouldRecoverStatusAndQuota()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        Dictionary<string, string?> settings = new Dictionary<string, string?>
        {
            { "FileStorage:BasePath", _tempStoragePath }
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        LocalFileStorageService storage = new LocalFileStorageService(config);
        SubscriptionQuotaService quota = new SubscriptionQuotaService(context);
        TenantAccessService tenantAccess = new TenantAccessService(context);
        AuditService audit = new AuditService(context, tenantAccess);

        FileService cancellingFileService = new FileService(
            context,
            storage,
            new CancellingValidatorStub(),
            quota,
            audit,
            tenantAccess);

        Guid ownerId = Guid.NewGuid();
        Workspace ws = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Recovery Org",
            Slug = "recovery-org",
            OwnerUserId = ownerId,
            Plan = PlanTier.Starter,
            MonthlyFilesQuota = 5,
            MaxRowsPerFile = 500
        };
        ImportProject proj = new ImportProject
        {
            Id = Guid.NewGuid(),
            WorkspaceId = ws.Id,
            Workspace = ws,
            Name = "Recovery Proj"
        };
        context.Workspaces.Add(ws);
        context.ImportProjects.Add(proj);
        await context.SaveChangesAsync();

        byte[] csvBytes = Encoding.UTF8.GetBytes("A1_COD,A1_NOME\n001,Empresa");
        using MemoryStream uploadStream = new MemoryStream(csvBytes);
        ServiceResult<ImportFileDto> uploaded = await cancellingFileService.UploadFileAsync(
            proj.Id,
            "teste_cancel.csv",
            "text/csv",
            csvBytes.Length,
            uploadStream,
            ownerId,
            ws.Id);

        Assert.True(uploaded.IsSuccess);
        Guid fileId = uploaded.Data!.Id;
        Assert.Equal(1, ws.MonthlyFilesUploaded);

        // 1. Cancelamento não pode deixar arquivo preso em Processing (retorna erro controlado e marca Failed)
        ServiceResult<ValidationReportDto> cancelResult = await cancellingFileService.ValidateFileAsync(
            fileId,
            null,
            ownerId,
            ws.Id);

        Assert.False(cancelResult.IsSuccess);
        ImportFile reloadedAfterCancel = await context.ImportFiles.FirstAsync(f => f.Id == fileId);
        Assert.NotEqual(FileStatus.Processing, reloadedAfterCancel.Status);
        Assert.Equal(FileStatus.Failed, reloadedAfterCancel.Status);

        // 2. Se o disco efêmero perdeu um novo arquivo enquanto estava Pending, marca Failed e estorna a cota mensal
        using MemoryStream secondUploadStream = new MemoryStream(csvBytes);
        ServiceResult<ImportFileDto> secondUploaded = await cancellingFileService.UploadFileAsync(
            proj.Id,
            "teste_disco_efemero.csv",
            "text/csv",
            csvBytes.Length,
            secondUploadStream,
            ownerId,
            ws.Id);
        Assert.True(secondUploaded.IsSuccess);
        Guid secondFileId = secondUploaded.Data!.Id;
        Assert.Equal(2, ws.MonthlyFilesUploaded);

        ImportFile pendingFile = await context.ImportFiles.FirstAsync(f => f.Id == secondFileId);
        await storage.DeleteFileAsync(pendingFile.StoredFileName);

        FileService normalFileService = CreateFileService(context);
        ServiceResult<ValidationReportDto> missingDiskResult = await normalFileService.ValidateFileAsync(
            secondFileId,
            null,
            ownerId,
            ws.Id);

        Assert.False(missingDiskResult.IsSuccess);
        Assert.Equal(FileStatus.Failed, pendingFile.Status);
        Assert.Equal(1, ws.MonthlyFilesUploaded);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempStoragePath))
        {
            Directory.Delete(_tempStoragePath, recursive: true);
        }
    }
}
