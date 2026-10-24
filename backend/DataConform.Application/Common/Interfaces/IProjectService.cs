using DataConform.Application.Common.Models;
using DataConform.Application.Projects.Dtos;

namespace DataConform.Application.Common.Interfaces;

public interface IProjectService
{
    Task<ServiceResult<ImportProjectDto>> CreateProjectAsync(
        Guid workspaceId,
        CreateImportProjectRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<List<ImportProjectDto>>> GetProjectsByWorkspaceAsync(
        Guid workspaceId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportProjectDto>> GetProjectByIdAsync(
        Guid projectId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteProjectAsync(
        Guid projectId,
        Guid? userId,
        CancellationToken cancellationToken = default);
}
