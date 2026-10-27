using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Projects.Dtos;
using DataConform.Domain.Entities;

namespace DataConform.Application.Services;

public class ProjectService : IProjectService
{
    private const string ForbiddenTitle = "Acesso negado Ã  organizaÃ§Ã£o";
    private const string ForbiddenMessage = "VocÃª nÃ£o possui permissÃ£o para visualizar ou modificar recursos desta organizaÃ§Ã£o.";

    private readonly IApplicationDbContext _dbContext;
    private readonly IAuditService _auditService;
    private readonly ITenantAccessService _tenantAccessService;
    private readonly IFileStorageService? _fileStorage;

    public ProjectService(
        IApplicationDbContext dbContext,
        IAuditService auditService,
        ITenantAccessService tenantAccessService,
        IFileStorageService? fileStorage = null)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _tenantAccessService = tenantAccessService;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResult<ImportProjectDto>> CreateProjectAsync(
        Guid workspaceId,
        CreateImportProjectRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResult<ImportProjectDto>.Failure(
                ServiceErrorType.Validation,
                "O nome do projeto Ã© obrigatÃ³rio.");
        }

        bool workspaceExists = await _dbContext.Workspaces
            .AnyAsync(w => w.Id == workspaceId, cancellationToken);

        if (!workspaceExists)
        {
            return ServiceResult<ImportProjectDto>.Failure(
                ServiceErrorType.NotFound,
                "Workspace informado nÃ£o foi encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, workspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<ImportProjectDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        ImportProject project = new ImportProject
        {
            WorkspaceId = workspaceId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            TargetSystem = request.TargetSystem?.Trim()
        };

        _dbContext.ImportProjects.Add(project);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            workspaceId,
            userId,
            "CreateProject",
            "ImportProject",
            project.Id.ToString(),
            $"Projeto '{project.Name}' (Destino: {project.TargetSystem ?? "GenÃ©rico"}) criado.",
            cancellationToken);

        ImportProjectDto dto = MapToProjectDto(project, 0);
        return ServiceResult<ImportProjectDto>.Success(dto);
    }

    public async Task<ServiceResult<List<ImportProjectDto>>> GetProjectsByWorkspaceAsync(
        Guid workspaceId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        bool workspaceExists = await _dbContext.Workspaces
            .AnyAsync(w => w.Id == workspaceId, cancellationToken);

        if (!workspaceExists)
        {
            return ServiceResult<List<ImportProjectDto>>.Failure(
                ServiceErrorType.NotFound,
                "Workspace informado nÃ£o foi encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, workspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<List<ImportProjectDto>>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        List<ImportProjectDto> list = await _dbContext.ImportProjects
            .Where(p => p.WorkspaceId == workspaceId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ImportProjectDto
            {
                Id = p.Id,
                WorkspaceId = p.WorkspaceId,
                Name = p.Name,
                Description = p.Description,
                TargetSystem = p.TargetSystem,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                FilesCount = p.Files.Count
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<List<ImportProjectDto>>.Success(list);
    }

    public async Task<ServiceResult<ImportProjectDto>> GetProjectByIdAsync(
        Guid projectId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default)
    {
        ImportProject? project = await _dbContext.ImportProjects
            .Include(p => p.Files)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return ServiceResult<ImportProjectDto>.Failure(
                ServiceErrorType.NotFound,
                "Projeto de importaÃ§Ã£o nÃ£o encontrado.");
        }

        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, project.WorkspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<ImportProjectDto>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        ImportProjectDto dto = MapToProjectDto(project, project.Files.Count);
        return ServiceResult<ImportProjectDto>.Success(dto);
    }

    public async Task<ServiceResult> DeleteProjectAsync(
        Guid projectId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        ImportProject? project = await _dbContext.ImportProjects
            .Include(p => p.Files)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return ServiceResult.Failure(
                ServiceErrorType.NotFound,
                "Projeto de importação não encontrado.");
        }

        Guid workspaceId = project.WorkspaceId;
        string projectName = project.Name;
        List<string> storedFileNames = project.Files
            .Select(f => f.StoredFileName)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();

        _dbContext.ImportProjects.Remove(project);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (_fileStorage != null)
        {
            foreach (string storedFileName in storedFileNames)
            {
                try
                {
                    await _fileStorage.DeleteFileAsync(storedFileName, cancellationToken);
                }
                catch (Exception)
                {
                    // Ignora caso o arquivo físico não exista no disco efêmero
                }
            }
        }

        await _auditService.LogAsync(
            workspaceId,
            userId,
            "DeleteProject",
            "ImportProject",
            projectId.ToString(),
            $"Projeto '{projectName}' e todos os seus arquivos foram excluÃ­dos.",
            cancellationToken);

        return ServiceResult.Success();
    }

    private static ImportProjectDto MapToProjectDto(ImportProject project, int filesCount)
    {
        return new ImportProjectDto
        {
            Id = project.Id,
            WorkspaceId = project.WorkspaceId,
            Name = project.Name,
            Description = project.Description,
            TargetSystem = project.TargetSystem,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            FilesCount = filesCount
        };
    }
}
