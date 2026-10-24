using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.Extensions.Logging;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence;

public class DataConformDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentUserService? _currentUserService;
    private readonly IFileStorageService? _fileStorageService;
    private readonly ILogger<DataConformDbContext>? _logger;

    public DataConformDbContext(
        DbContextOptions<DataConformDbContext> options,
        ICurrentUserService? currentUserService = null,
        IFileStorageService? fileStorageService = null,
        ILogger<DataConformDbContext>? logger = null)
        : base(options)
    {
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public Guid? CurrentUserId => _currentUserService?.UserId;
    public Guid? CurrentWorkspaceId => _currentUserService?.PrimaryWorkspaceId;

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<ImportProject> ImportProjects => Set<ImportProject>();
    public DbSet<ImportFile> ImportFiles => Set<ImportFile>();
    public DbSet<ValidationIssue> ValidationIssues => Set<ValidationIssue>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<CustomerFeedback> CustomerFeedbacks => Set<CustomerFeedback>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DataConformDbContext).Assembly);

        // Global Multi-Tenant Query Filters (Defense-in-Depth ORM Layer)
        modelBuilder.Entity<Workspace>().HasQueryFilter(w =>
            CurrentUserId == null ||
            w.Id == CurrentWorkspaceId ||
            w.OwnerUserId == CurrentUserId ||
            w.Users.Any(u => u.Id == CurrentUserId) ||
            w.AuditLogs.Any(a => a.UserId == CurrentUserId && a.Action == "CreateWorkspace"));

        modelBuilder.Entity<ImportProject>().HasQueryFilter(p =>
            CurrentUserId == null ||
            p.WorkspaceId == CurrentWorkspaceId ||
            p.Workspace.OwnerUserId == CurrentUserId ||
            p.Workspace.Users.Any(u => u.Id == CurrentUserId) ||
            p.Workspace.AuditLogs.Any(a => a.UserId == CurrentUserId && a.Action == "CreateWorkspace"));

        modelBuilder.Entity<ImportFile>().HasQueryFilter(f =>
            CurrentUserId == null ||
            f.Project.WorkspaceId == CurrentWorkspaceId ||
            f.Project.Workspace.Users.Any(u => u.Id == CurrentUserId) ||
            f.Project.Workspace.AuditLogs.Any(a => a.UserId == CurrentUserId && a.Action == "CreateWorkspace"));

        modelBuilder.Entity<ValidationIssue>().HasQueryFilter(i =>
            CurrentUserId == null ||
            i.File.Project.WorkspaceId == CurrentWorkspaceId ||
            i.File.Project.Workspace.Users.Any(u => u.Id == CurrentUserId) ||
            i.File.Project.Workspace.AuditLogs.Any(a => a.UserId == CurrentUserId && a.Action == "CreateWorkspace"));
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        HashSet<string> filesToDeleteAfterCommit = await CollectStoredFilesForPendingDeletionsAsync(cancellationToken);

        int affectedRows = await base.SaveChangesAsync(cancellationToken);

        if (filesToDeleteAfterCommit.Count > 0 && _fileStorageService != null)
        {
            foreach (string storedFileName in filesToDeleteAfterCommit)
            {
                try
                {
                    await _fileStorageService.DeleteFileAsync(storedFileName, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(
                        ex,
                        "Não foi possível remover o arquivo físico '{StoredFileName}' após confirmação da transação no banco.",
                        storedFileName);
                }
            }
        }

        return affectedRows;
    }

    private async Task<HashSet<string>> CollectStoredFilesForPendingDeletionsAsync(CancellationToken cancellationToken)
    {
        HashSet<string> storedFileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (_fileStorageService == null)
        {
            return storedFileNames;
        }

        foreach (EntityEntry<ImportFile> fileEntry in ChangeTracker.Entries<ImportFile>())
        {
            if (fileEntry.State == EntityState.Deleted && !string.IsNullOrWhiteSpace(fileEntry.Entity.StoredFileName))
            {
                storedFileNames.Add(fileEntry.Entity.StoredFileName);
            }
        }

        List<Guid> deletedProjectIds = ChangeTracker.Entries<ImportProject>()
            .Where(e => e.State == EntityState.Deleted)
            .Select(e => e.Entity.Id)
            .ToList();

        if (deletedProjectIds.Count > 0)
        {
            List<string> projectFileNames = await ImportFiles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(f => deletedProjectIds.Contains(f.ProjectId))
                .Select(f => f.StoredFileName)
                .ToListAsync(cancellationToken);

            foreach (string fileName in projectFileNames)
            {
                if (!string.IsNullOrWhiteSpace(fileName))
                {
                    storedFileNames.Add(fileName);
                }
            }
        }

        List<Guid> deletedWorkspaceIds = ChangeTracker.Entries<Workspace>()
            .Where(e => e.State == EntityState.Deleted)
            .Select(e => e.Entity.Id)
            .ToList();

        if (deletedWorkspaceIds.Count > 0)
        {
            List<string> workspaceFileNames = await ImportFiles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(f => deletedWorkspaceIds.Contains(f.Project.WorkspaceId))
                .Select(f => f.StoredFileName)
                .ToListAsync(cancellationToken);

            foreach (string fileName in workspaceFileNames)
            {
                if (!string.IsNullOrWhiteSpace(fileName))
                {
                    storedFileNames.Add(fileName);
                }
            }
        }

        return storedFileNames;
    }
}
