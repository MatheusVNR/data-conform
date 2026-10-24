using System.Text;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Files.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class FileService : IFileService
{
    private const long MaxFileSizeBytes = 50L * 1024L * 1024L; // 50 MB teto global
    private const string ForbiddenTitle = "Acesso negado Ã  organizaÃ§Ã£o";
    private const string ForbiddenMessage = "VocÃª nÃ£o possui permissÃ£o para visualizar ou modificar recursos desta organizaÃ§Ã£o.";

    private readonly IApplicationDbContext _dbContext;
    private readonly IFileStorageService _fileStorage;
    private readonly ICsvValidatorService _validatorService;
    private readonly ISubscriptionQuotaService _quotaService;
    private readonly IAuditService _auditService;
    private readonly ITenantAccessService _tenantAccessService;

    public FileService(
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        ICsvValidatorService validatorService,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        ITenantAccessService tenantAccessService)
    {
        _dbContext = dbContext;
        _fileStorage = fileStorage;
        _validatorService = validatorService;
        _quotaService = quotaService;
        _auditService = auditService;
        _tenantAccessService = tenantAccessService;
    }

    public async Task<ServiceResult<ImportFileDto>> UploadFileAsync(
        Guid projectId,
        string? originalFileName,
        string? contentType,
        long byteSize,
        Stream? fileStream,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        if (fileStream == null || byteSize <= 0 || string.IsNullOrWhiteSpace(originalFileName))
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Validation,
                "Nenhum arquivo foi enviado ou o arquivo estÃ¡ vazio.");
        }

        if (byteSize > MaxFileSizeBytes)
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Validation,
                $"O tamanho do arquivo excede o teto mÃ¡ximo permitido de {MaxFileSizeBytes / (1024 * 1024)} MB.");
        }

        string safeFileName = Path.GetFileName(originalFileName);
        string extension = Path.GetExtension(safeFileName).ToLowerInvariant();

        if (extension != ".csv" && extension != ".txt")
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Validation,
                "Formato de arquivo nÃ£o suportado. Por favor, envie um arquivo delimitado .csv ou .txt.");
        }

        ImportProject? project = await _dbContext.ImportProjects
            .Include(p => p.Workspace)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.NotFound,
                "Projeto de importaÃ§Ã£o informado nÃ£o foi encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, project.WorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        long maxPlanSizeBytes = project.Workspace.Plan switch
        {
            PlanTier.Enterprise => 50L * 1024L * 1024L,
            PlanTier.Professional => 25L * 1024L * 1024L,
            _ => 5L * 1024L * 1024L
        };

        if (byteSize > maxPlanSizeBytes)
        {
            long maxMb = maxPlanSizeBytes / (1024L * 1024L);
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Validation,
                $"O arquivo enviado ({byteSize / 1024} KB) excede o limite de {maxMb} MB por arquivo do seu plano ({project.Workspace.Plan}). FaÃ§a upgrade para enviar lotes maiores.");
        }

        // Copia para MemoryStream para permitir contagem de linhas e gravaÃ§Ã£o sem fechar o stream original prematuramente
        using MemoryStream bufferedStream = new MemoryStream();
        await fileStream.CopyToAsync(bufferedStream, cancellationToken);
        bufferedStream.Position = 0;

        int dataRowCount = 0;
        using (StreamReader countReader = new StreamReader(bufferedStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true))
        {
            bool isHeaderLine = true;
            string? currentLine;
            while ((currentLine = await countReader.ReadLineAsync(cancellationToken)) != null)
            {
                if (string.IsNullOrWhiteSpace(currentLine))
                {
                    continue;
                }

                if (isHeaderLine)
                {
                    isHeaderLine = false;
                    continue;
                }

                dataRowCount++;
            }
        }

        QuotaCheckResult quotaCheck = await _quotaService.CheckUploadQuotaAsync(project.WorkspaceId, dataRowCount, cancellationToken);
        if (!quotaCheck.IsAllowed)
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.QuotaExceeded,
                quotaCheck.Reason ?? "Limite do plano atingido.",
                "Limite do plano atingido");
        }

        bufferedStream.Position = 0;
        string storedFileName = await _fileStorage.SaveFileAsync(bufferedStream, safeFileName, cancellationToken);

        ImportFile importFile = new ImportFile
        {
            ProjectId = projectId,
            OriginalFileName = safeFileName,
            StoredFileName = storedFileName,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "text/csv" : contentType,
            ByteSize = byteSize,
            TotalRows = dataRowCount,
            Status = FileStatus.Pending
        };

        _dbContext.ImportFiles.Add(importFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _quotaService.IncrementFilesUploadedAsync(project.WorkspaceId, cancellationToken);
        await _auditService.LogAsync(
            project.WorkspaceId,
            userId,
            "UploadFile",
            "ImportFile",
            importFile.Id.ToString(),
            $"Arquivo '{safeFileName}' ({byteSize} bytes) enviado com sucesso.",
            cancellationToken);

        ImportFileDto dto = MapToFileDto(importFile);
        return ServiceResult<ImportFileDto>.Success(dto);
    }

    public async Task<ServiceResult<List<ImportFileDto>>> GetFilesByProjectAsync(
        Guid projectId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        ImportProject? project = await _dbContext.ImportProjects
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return ServiceResult<List<ImportFileDto>>.Failure(
                ServiceErrorType.NotFound,
                "Projeto de importaÃ§Ã£o nÃ£o encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, project.WorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<List<ImportFileDto>>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        List<ImportFileDto> list = await _dbContext.ImportFiles
            .Where(f => f.ProjectId == projectId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new ImportFileDto
            {
                Id = f.Id,
                ProjectId = f.ProjectId,
                OriginalFileName = f.OriginalFileName,
                ContentType = f.ContentType,
                ByteSize = f.ByteSize,
                Status = f.Status,
                TotalRows = f.TotalRows,
                ValidRows = f.ValidRows,
                ErrorRows = f.ErrorRows,
                CreatedAt = f.CreatedAt,
                ProcessedAt = f.ProcessedAt
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<List<ImportFileDto>>.Success(list);
    }

    public async Task<ServiceResult<ValidationReportDto>> ValidateFileAsync(
        Guid fileId,
        string? requiredColumns,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        ImportFile? importFile = await _dbContext.ImportFiles
            .Include(f => f.ValidationIssues)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.NotFound,
                "Arquivo informado nÃ£o foi encontrado.");
        }

        ImportProject? project = await _dbContext.ImportProjects
            .FirstOrDefaultAsync(p => p.Id == importFile.ProjectId, cancellationToken);

        if (project == null)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.NotFound,
                "Projeto de importaÃ§Ã£o nÃ£o encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, project.WorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        if (importFile.Status == FileStatus.Processing)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.Conflict,
                "Este arquivo jÃ¡ estÃ¡ sendo processado no momento. Aguarde a conclusÃ£o.");
        }

        importFile.Status = FileStatus.Processing;
        await _dbContext.SaveChangesAsync(cancellationToken);

        string[]? requiredColumnsList = null;
        if (!string.IsNullOrWhiteSpace(requiredColumns))
        {
            requiredColumnsList = requiredColumns.Split(',')
                .Select(c => c.Trim())
                .Where(c => !string.IsNullOrEmpty(c))
                .ToArray();
        }

        try
        {
            using Stream contentStream = await _fileStorage.GetFileStreamAsync(importFile.StoredFileName, cancellationToken);
            FileValidationResult validationResult = await _validatorService.ValidateCsvStreamAsync(
                contentStream,
                importFile.Id,
                requiredColumnsList,
                cancellationToken);

            QuotaCheckResult rowQuotaCheck = await _quotaService.CheckUploadQuotaAsync(
                project.WorkspaceId,
                validationResult.TotalRows,
                cancellationToken);

            if (!rowQuotaCheck.IsAllowed)
            {
                importFile.Status = FileStatus.Failed;
                await _dbContext.SaveChangesAsync(cancellationToken);
                return ServiceResult<ValidationReportDto>.Failure(
                    ServiceErrorType.QuotaExceeded,
                    rowQuotaCheck.Reason ?? "Limite de linhas do plano excedido.",
                    "Limite de linhas do plano excedido");
            }

            if (importFile.ValidationIssues.Count > 0)
            {
                _dbContext.ValidationIssues.RemoveRange(importFile.ValidationIssues);
            }

            foreach (ValidationIssue issue in validationResult.Issues)
            {
                _dbContext.ValidationIssues.Add(issue);
            }

            importFile.Status = FileStatus.Completed;
            importFile.TotalRows = validationResult.TotalRows;
            importFile.ValidRows = validationResult.ValidRows;
            importFile.ErrorRows = validationResult.ErrorRows;
            importFile.ProcessedAt = DateTimeOffset.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditService.LogAsync(
                project.WorkspaceId,
                userId,
                "ValidateFile",
                "ImportFile",
                importFile.Id.ToString(),
                $"Arquivo validado: {validationResult.TotalRows} linhas, {validationResult.Issues.Count} inconsistÃªncias.",
                cancellationToken);

            ValidationReportDto report = new ValidationReportDto
            {
                FileId = importFile.Id,
                OriginalFileName = importFile.OriginalFileName,
                Status = importFile.Status,
                TotalRows = validationResult.TotalRows,
                ValidRows = validationResult.ValidRows,
                ErrorRows = validationResult.ErrorRows,
                ProcessedAt = importFile.ProcessedAt,
                Issues = validationResult.Issues.Select(i => new ValidationIssueDto
                {
                    Id = i.Id,
                    RowNumber = i.RowNumber,
                    ColumnName = i.ColumnName,
                    IssueCode = i.IssueCode,
                    Message = i.Message,
                    Severity = i.Severity,
                    RawValue = i.RawValue,
                    CreatedAt = i.CreatedAt
                }).ToList()
            };

            return ServiceResult<ValidationReportDto>.Success(report);
        }
        catch (Exception)
        {
            importFile.Status = FileStatus.Failed;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.InternalError,
                "NÃ£o foi possÃ­vel concluir a leitura do arquivo enviado. Verifique se a planilha estÃ¡ Ã­ntegra e no formato CSV esperado.",
                "Falha ao processar o arquivo");
        }
    }

    public async Task<ServiceResult<ValidationReportDto>> GetValidationReportAsync(
        Guid fileId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        ImportFile? importFile = await _dbContext.ImportFiles
            .Include(f => f.Project)
            .Include(f => f.ValidationIssues)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.NotFound,
                "Arquivo informado nÃ£o foi encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, importFile.Project.WorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<ValidationReportDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        ValidationReportDto report = new ValidationReportDto
        {
            FileId = importFile.Id,
            OriginalFileName = importFile.OriginalFileName,
            Status = importFile.Status,
            TotalRows = importFile.TotalRows ?? 0,
            ValidRows = importFile.ValidRows ?? 0,
            ErrorRows = importFile.ErrorRows ?? 0,
            ProcessedAt = importFile.ProcessedAt,
            Issues = importFile.ValidationIssues
                .OrderBy(i => i.RowNumber)
                .Select(i => new ValidationIssueDto
                {
                    Id = i.Id,
                    RowNumber = i.RowNumber,
                    ColumnName = i.ColumnName,
                    IssueCode = i.IssueCode,
                    Message = i.Message,
                    Severity = i.Severity,
                    RawValue = i.RawValue,
                    CreatedAt = i.CreatedAt
                })
                .ToList()
        };

        return ServiceResult<ValidationReportDto>.Success(report);
    }

    public async Task<ServiceResult> DeleteFileAsync(
        Guid fileId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        ImportFile? importFile = await _dbContext.ImportFiles
            .Include(f => f.Project)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return ServiceResult.Failure(
                ServiceErrorType.NotFound,
                "Arquivo informado nÃ£o foi encontrado.");
        }

        Guid workspaceId = importFile.Project.WorkspaceId;
        string fileName = importFile.OriginalFileName;

        _dbContext.ImportFiles.Remove(importFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            workspaceId,
            userId,
            "DeleteFile",
            "ImportFile",
            fileId.ToString(),
            $"Arquivo '{fileName}' foi excluÃ­do do projeto.",
            cancellationToken);

        return ServiceResult.Success();
    }

    private static ImportFileDto MapToFileDto(ImportFile importFile)
    {
        return new ImportFileDto
        {
            Id = importFile.Id,
            ProjectId = importFile.ProjectId,
            OriginalFileName = importFile.OriginalFileName,
            ContentType = importFile.ContentType,
            ByteSize = importFile.ByteSize,
            Status = importFile.Status,
            TotalRows = importFile.TotalRows,
            ValidRows = importFile.ValidRows,
            ErrorRows = importFile.ErrorRows,
            CreatedAt = importFile.CreatedAt,
            ProcessedAt = importFile.ProcessedAt
        };
    }
}
