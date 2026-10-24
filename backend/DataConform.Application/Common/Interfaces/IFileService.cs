using DataConform.Application.Common.Models;
using DataConform.Application.Files.Dtos;

namespace DataConform.Application.Common.Interfaces;

public interface IFileService
{
    Task<ServiceResult<ImportFileDto>> UploadFileAsync(
        Guid projectId,
        string? originalFileName,
        string? contentType,
        long byteSize,
        Stream? fileStream,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<List<ImportFileDto>>> GetFilesByProjectAsync(
        Guid projectId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<ValidationReportDto>> ValidateFileAsync(
        Guid fileId,
        string? requiredColumns,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<ValidationReportDto>> GetValidationReportAsync(
        Guid fileId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteFileAsync(
        Guid fileId,
        Guid? userId,
        CancellationToken cancellationToken = default);
}
