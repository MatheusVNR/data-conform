using Microsoft.EntityFrameworkCore;
using DataConform.Domain.Entities;

namespace DataConform.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Workspace> Workspaces { get; }
    DbSet<ImportProject> ImportProjects { get; }
    DbSet<ImportFile> ImportFiles { get; }
    DbSet<ValidationIssue> ValidationIssues { get; }
    DbSet<User> Users { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
