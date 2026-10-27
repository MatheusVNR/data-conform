using System.Text;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Common.Security;
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

        int bufferCheckSize = (int)Math.Min(512L, byteSize);
        byte[] sniffBuffer = new byte[bufferCheckSize];
        int bytesRead = await fileStream.ReadAsync(sniffBuffer.AsMemory(0, bufferCheckSize), cancellationToken);

        if (IsBinaryOrExecutable(sniffBuffer, bytesRead))
        {
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.Validation,
                "Conteúdo binário ou executável detectado. O arquivo deve ser um documento de texto (.csv ou .txt).");
        }

        Stream streamToSave;
        bool shouldDisposeStreamToSave = false;
        if (fileStream.CanSeek)
        {
            fileStream.Position = 0;
            streamToSave = fileStream;
        }
        else
        {
            MemoryStream prefixStream = new MemoryStream(sniffBuffer, 0, bytesRead, writable: false);
            streamToSave = new PrefixStream(prefixStream, fileStream, leaveOpen: true);
            shouldDisposeStreamToSave = true;
        }

        string storedFileName;
        try
        {
            storedFileName = await _fileStorage.SaveFileAsync(streamToSave, safeFileName, cancellationToken);
        }
        finally
        {
            if (shouldDisposeStreamToSave)
            {
                streamToSave.Dispose();
            }
        }

        int dataRowCount = 0;
        using (Stream diskStream = await _fileStorage.GetFileStreamAsync(storedFileName, cancellationToken))
        using (StreamReader countReader = new StreamReader(diskStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 4096))
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
            await _fileStorage.DeleteFileAsync(storedFileName, cancellationToken);
            return ServiceResult<ImportFileDto>.Failure(
                ServiceErrorType.QuotaExceeded,
                quotaCheck.Reason ?? "Limite do plano atingido.",
                "Limite do plano atingido");
        }

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
            .Include(p => p.Workspace)
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

            if (project.Workspace != null && validationResult.TotalRows > project.Workspace.MaxRowsPerFile)
            {
                importFile.Status = FileStatus.Failed;
                await _dbContext.SaveChangesAsync(cancellationToken);
                return ServiceResult<ValidationReportDto>.Failure(
                    ServiceErrorType.QuotaExceeded,
                    $"O arquivo contém {validationResult.TotalRows:N0} linhas, excedendo o teto de {project.Workspace.MaxRowsPerFile:N0} linhas por arquivo do plano atual ({project.Workspace.Plan}). Para validar bases com esse volume, faça upgrade para o plano Professional ou Enterprise.",
                    "Limite de linhas do plano excedido");
            }

            const int maxPersistedIssues = 1000;
            List<ValidationIssue> issuesToPersist = validationResult.Issues.Take(maxPersistedIssues).ToList();

            foreach (ValidationIssue issue in issuesToPersist)
            {
                issue.RawValue = CsvFormulaSanitizer.Sanitize(issue.RawValue);
            }

            if (validationResult.Issues.Count > maxPersistedIssues)
            {
                issuesToPersist.Add(new ValidationIssue
                {
                    FileId = importFile.Id,
                    RowNumber = maxPersistedIssues + 1,
                    ColumnName = "Geral",
                    IssueCode = "ISSUE_LIMIT_EXCEEDED",
                    Message = $"Exibindo as primeiras {maxPersistedIssues:N0} inconsistências detectadas de um total superior ({validationResult.Issues.Count:N0}). Corrija os erros listados e reprocesse o arquivo.",
                    Severity = IssueSeverity.Warning,
                    RawValue = string.Empty
                });
            }

            bool previousAutoDetect = _dbContext.ChangeTracker.AutoDetectChangesEnabled;
            try
            {
                _dbContext.ChangeTracker.AutoDetectChangesEnabled = false;

                if (importFile.ValidationIssues.Count > 0)
                {
                    _dbContext.ValidationIssues.RemoveRange(importFile.ValidationIssues);
                }

                _dbContext.ValidationIssues.AddRange(issuesToPersist);
            }
            finally
            {
                _dbContext.ChangeTracker.AutoDetectChangesEnabled = previousAutoDetect;
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
                $"Arquivo validado: {validationResult.TotalRows} linhas, {validationResult.Issues.Count} inconsistências.",
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
                Issues = issuesToPersist.Select(i => new ValidationIssueDto
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
        string storedFileName = importFile.StoredFileName;

        _dbContext.ImportFiles.Remove(importFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(storedFileName))
        {
            try
            {
                await _fileStorage.DeleteFileAsync(storedFileName, cancellationToken);
            }
            catch (Exception)
            {
                // Ignora caso o armazenamento efêmero já tenha removido o arquivo físico
            }
        }

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

    private static bool IsBinaryOrExecutable(byte[] buffer, int length)
    {
        if (length == 0)
        {
            return false;
        }

        // PE Executable ("MZ")
        if (length >= 2 && buffer[0] == 0x4D && buffer[1] == 0x5A)
        {
            return true;
        }

        // ELF Executable ("\x7fELF")
        if (length >= 4 && buffer[0] == 0x7F && buffer[1] == 0x45 && buffer[2] == 0x4C && buffer[3] == 0x46)
        {
            return true;
        }

        // Mach-O Executables
        if (length >= 4 && (
            (buffer[0] == 0xFE && buffer[1] == 0xED && buffer[2] == 0xFA && (buffer[3] == 0xCE || buffer[3] == 0xCF)) ||
            (buffer[0] == 0xCF && buffer[1] == 0xFA && buffer[2] == 0xED && buffer[3] == 0xFE) ||
            (buffer[0] == 0xCA && buffer[1] == 0xFE && buffer[2] == 0xBA && buffer[3] == 0xBE)))
        {
            return true;
        }

        // ZIP / Java Archive / Office Open XML ("PK\x03\x04")
        if (length >= 4 && buffer[0] == 0x50 && buffer[1] == 0x4B && buffer[2] == 0x03 && buffer[3] == 0x04)
        {
            return true;
        }

        // Null bytes within initial bytes typically mean binary/corrupt file (excluding UTF-16 BOM if any)
        bool isUtf16Le = length >= 2 && buffer[0] == 0xFF && buffer[1] == 0xFE;
        bool isUtf16Be = length >= 2 && buffer[0] == 0xFE && buffer[1] == 0xFF;

        if (!isUtf16Le && !isUtf16Be)
        {
            for (int i = 0; i < length; i++)
            {
                if (buffer[i] == 0x00)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private sealed class PrefixStream : Stream
    {
        private readonly Stream _prefixStream;
        private readonly Stream _mainStream;
        private readonly bool _leaveOpen;

        public PrefixStream(Stream prefixStream, Stream mainStream, bool leaveOpen = true)
        {
            _prefixStream = prefixStream;
            _mainStream = mainStream;
            _leaveOpen = leaveOpen;
        }

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => _prefixStream.Length + (_mainStream.CanSeek ? _mainStream.Length : 0);
        public override long Position
        {
            get => _prefixStream.Position + (_mainStream.CanSeek ? _mainStream.Position : 0);
            set => throw new NotSupportedException();
        }

        public override void Flush() { }

        public override int Read(byte[] buffer, int offset, int count)
        {
            int bytesRead = _prefixStream.Read(buffer, offset, count);
            if (bytesRead > 0)
            {
                return bytesRead;
            }
            return _mainStream.Read(buffer, offset, count);
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            int bytesRead = await _prefixStream.ReadAsync(buffer.AsMemory(offset, count), cancellationToken);
            if (bytesRead > 0)
            {
                return bytesRead;
            }
            return await _mainStream.ReadAsync(buffer.AsMemory(offset, count), cancellationToken);
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            int bytesRead = await _prefixStream.ReadAsync(buffer, cancellationToken);
            if (bytesRead > 0)
            {
                return bytesRead;
            }
            return await _mainStream.ReadAsync(buffer, cancellationToken);
        }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _prefixStream.Dispose();
                if (!_leaveOpen)
                {
                    _mainStream.Dispose();
                }
            }
            base.Dispose(disposing);
        }
    }
}
