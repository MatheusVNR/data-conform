using DataConform.Application.Common.Models;

namespace DataConform.Application.Common.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        Guid workspaceId,
        Guid? userId,
        string action,
        string entityName,
        string entityId,
        string? details = null,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<List<AuditLogDto>>> GetWorkspaceAuditLogsAsync(
        Guid workspaceId,
        Guid? userId,
        Guid? primaryWorkspaceId,
        int maxRecords = 50,
        CancellationToken cancellationToken = default);
}
