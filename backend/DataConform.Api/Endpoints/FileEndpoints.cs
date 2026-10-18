using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Files.Dtos;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Api.Endpoints;

public static class FileEndpoints
{
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB teto global

    public static RouteGroupBuilder MapFileEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api")
            .WithTags("Files")
            .RequireAuthorization();

        group.MapPost("/projects/{projectId:guid}/files/upload", UploadFile)
            .WithName("UploadFile")
            .DisableAntiforgery()
            .Produces<ImportFileDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/projects/{projectId:guid}/files", GetFilesByProject)
            .WithName("GetFilesByProject")
            .Produces<List<ImportFileDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/files/{fileId:guid}/validate", ValidateFile)
            .WithName("ValidateFile")
            .Produces<ValidationReportDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/files/{fileId:guid}/report", GetValidationReport)
            .WithName("GetValidationReport")
            .Produces<ValidationReportDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/files/{fileId:guid}", DeleteFile)
            .WithName("DeleteFile")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static Guid? TryGetAuthenticatedUserId(ClaimsPrincipal principal)
    {
        return TenantAuthorizationHelper.GetAuthenticatedUserId(principal);
    }

    private static async Task<IResult> UploadFile(
        Guid projectId,
        IFormFile? file,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return Results.BadRequest(new { error = "Nenhum arquivo foi enviado ou o arquivo está vazio." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return Results.BadRequest(new { error = $"O tamanho do arquivo excede o teto máximo permitido de {MaxFileSizeBytes / (1024 * 1024)} MB." });
        }

        string originalFileName = Path.GetFileName(file.FileName);
        string extension = Path.GetExtension(originalFileName).ToLowerInvariant();

        if (extension != ".csv" && extension != ".txt")
        {
            return Results.BadRequest(new { error = "Formato de arquivo não suportado. Por favor, envie um arquivo delimitado .csv ou .txt." });
        }

        ImportProject? project = await dbContext.ImportProjects
            .Include(p => p.Workspace)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return Results.NotFound(new { error = "Projeto de importação informado não foi encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        long maxPlanSizeBytes = project.Workspace.Plan switch
        {
            PlanTier.Enterprise => 50L * 1024L * 1024L,
            PlanTier.Professional => 25L * 1024L * 1024L,
            _ => 5L * 1024L * 1024L
        };

        if (file.Length > maxPlanSizeBytes)
        {
            long maxMb = maxPlanSizeBytes / (1024L * 1024L);
            return Results.BadRequest(new
            {
                error = $"O arquivo enviado ({file.Length / 1024} KB) excede o limite de {maxMb} MB por arquivo do seu plano ({project.Workspace.Plan}). Faça upgrade para enviar lotes maiores."
            });
        }

        DataConform.Application.Common.Models.QuotaCheckResult quotaCheck = await quotaService.CheckUploadQuotaAsync(project.WorkspaceId, 0, cancellationToken);
        if (!quotaCheck.IsAllowed)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Limite do plano atingido",
                detail: quotaCheck.Reason);
        }

        using Stream fileStream = file.OpenReadStream();
        string storedFileName = await fileStorage.SaveFileAsync(fileStream, originalFileName, cancellationToken);

        ImportFile importFile = new ImportFile
        {
            ProjectId = projectId,
            OriginalFileName = originalFileName,
            StoredFileName = storedFileName,
            ContentType = file.ContentType ?? "text/csv",
            ByteSize = file.Length,
            Status = FileStatus.Pending
        };

        dbContext.ImportFiles.Add(importFile);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TryGetAuthenticatedUserId(claimsPrincipal);

        await quotaService.IncrementFilesUploadedAsync(project.WorkspaceId, cancellationToken);
        await auditService.LogAsync(
            project.WorkspaceId,
            currentUserId,
            "UploadFile",
            "ImportFile",
            importFile.Id.ToString(),
            $"Arquivo '{originalFileName}' ({file.Length} bytes) enviado com sucesso.",
            cancellationToken);

        ImportFileDto dto = new ImportFileDto
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

        return Results.Created($"/api/files/{importFile.Id}/report", dto);
    }

    private static async Task<IResult> GetFilesByProject(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        ImportProject? project = await dbContext.ImportProjects
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return Results.NotFound(new { error = "Projeto de importação não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        List<ImportFileDto> list = await dbContext.ImportFiles
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

        return Results.Ok(list);
    }

    private static async Task<IResult> ValidateFile(
        Guid fileId,
        [FromQuery] string? requiredColumns,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        ICsvValidatorService validatorService,
        ISubscriptionQuotaService quotaService,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        ImportFile? importFile = await dbContext.ImportFiles
            .Include(f => f.ValidationIssues)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return Results.NotFound(new { error = "Arquivo informado não foi encontrado." });
        }

        ImportProject? project = await dbContext.ImportProjects
            .FirstOrDefaultAsync(p => p.Id == importFile.ProjectId, cancellationToken);

        if (project == null)
        {
            return Results.NotFound(new { error = "Projeto de importação não encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        importFile.Status = FileStatus.Processing;
        await dbContext.SaveChangesAsync(cancellationToken);

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
            using Stream contentStream = await fileStorage.GetFileStreamAsync(importFile.StoredFileName, cancellationToken);
            FileValidationResult validationResult = await validatorService.ValidateCsvStreamAsync(
                contentStream,
                importFile.Id,
                requiredColumnsList,
                cancellationToken);

            DataConform.Application.Common.Models.QuotaCheckResult rowQuotaCheck = await quotaService.CheckUploadQuotaAsync(
                project.WorkspaceId,
                validationResult.TotalRows,
                cancellationToken);

            if (!rowQuotaCheck.IsAllowed)
            {
                importFile.Status = FileStatus.Failed;
                await dbContext.SaveChangesAsync(cancellationToken);
                return Results.Problem(
                    statusCode: StatusCodes.Status403Forbidden,
                    title: "Limite de linhas do plano excedido",
                    detail: rowQuotaCheck.Reason);
            }

            // Remover inconsistências anteriores caso revalide
            if (importFile.ValidationIssues.Count > 0)
            {
                dbContext.ValidationIssues.RemoveRange(importFile.ValidationIssues);
            }

            foreach (ValidationIssue issue in validationResult.Issues)
            {
                dbContext.ValidationIssues.Add(issue);
            }

            importFile.Status = FileStatus.Completed;
            importFile.TotalRows = validationResult.TotalRows;
            importFile.ValidRows = validationResult.ValidRows;
            importFile.ErrorRows = validationResult.ErrorRows;
            importFile.ProcessedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);

            Guid? currentUserId = TryGetAuthenticatedUserId(claimsPrincipal);
            await auditService.LogAsync(
                project.WorkspaceId,
                currentUserId,
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

            return Results.Ok(report);
        }
        catch (Exception ex)
        {
            importFile.Status = FileStatus.Failed;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Problem(detail: $"Falha ao processar o arquivo: {ex.Message}", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> GetValidationReport(
        Guid fileId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        ImportFile? importFile = await dbContext.ImportFiles
            .Include(f => f.Project)
            .Include(f => f.ValidationIssues)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return Results.NotFound(new { error = "Arquivo informado não foi encontrado." });
        }

        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, importFile.Project.WorkspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
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

        return Results.Ok(report);
    }

    private static async Task<IResult> DeleteFile(
        Guid fileId,
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IFileStorageService fileStorage,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        ImportFile? importFile = await dbContext.ImportFiles
            .Include(f => f.Project)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (importFile == null)
        {
            return Results.NotFound(new { error = "Arquivo informado não foi encontrado." });
        }

        Guid workspaceId = importFile.Project.WorkspaceId;
        bool canAccess = await TenantAuthorizationHelper.CanAccessWorkspaceAsync(claimsPrincipal, workspaceId, dbContext, cancellationToken);
        if (!canAccess)
        {
            return TenantAuthorizationHelper.ForbiddenTenantResult();
        }

        string fileName = importFile.OriginalFileName;

        await fileStorage.DeleteFileAsync(importFile.StoredFileName, cancellationToken);
        dbContext.ImportFiles.Remove(importFile);
        await dbContext.SaveChangesAsync(cancellationToken);

        Guid? currentUserId = TryGetAuthenticatedUserId(claimsPrincipal);

        await auditService.LogAsync(
            workspaceId,
            currentUserId,
            "DeleteFile",
            "ImportFile",
            fileId.ToString(),
            $"Arquivo '{fileName}' foi excluído do projeto.",
            cancellationToken);

        return Results.NoContent();
    }
}
