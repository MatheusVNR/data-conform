using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;

    public AuditService(IApplicationDbContext context)
    {
        _context = context;
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
}
