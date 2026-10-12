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
}
