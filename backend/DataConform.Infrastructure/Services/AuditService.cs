using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Services;

public class AuditService : IAuditService
{
    private const string ForbiddenTitle = "Acesso negado Ã  organizaÃ§Ã£o";
    private const string ForbiddenMessage = "VocÃª nÃ£o possui permissÃ£o para visualizar ou modificar recursos desta organizaÃ§Ã£o.";

    private readonly IApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccessService;

    public AuditService(IApplicationDbContext context, ITenantAccessService tenantAccessService)
    {
        _context = context;
        _tenantAccessService = tenantAccessService;
    }

    public async Task LogAsync(
        Guid workspaceId,
        Guid? userId,
        string action,
        string entityName,
        string entityId,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        AuditLog entry = new AuditLog
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            UserId = userId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.AuditLogs.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<ServiceResult<List<AuditLogDto>>> GetWorkspaceAuditLogsAsync(
        Guid workspaceId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        int maxRecords = 50,
        CancellationToken cancellationToken = default)
    {
        bool canAccess = await _tenantAccessService.CanAccessWorkspaceAsync(userId, primaryWorkspaceId, workspaceId, cancellationToken);
        if (!canAccess)
        {
            return ServiceResult<List<AuditLogDto>>.Failure(
                ServiceErrorType.Forbidden,
                ForbiddenMessage,
                ForbiddenTitle);
        }

        int safeLimit = Math.Clamp(maxRecords, 1, 200);

        List<AuditLogDto> list = await _context.AuditLogs
            .Where(a => a.WorkspaceId == workspaceId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(safeLimit)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                WorkspaceId = a.WorkspaceId,
                UserId = a.UserId,
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                Details = a.Details,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<List<AuditLogDto>>.Success(list);
    }
}
