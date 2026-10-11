using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence;

public class DataConformDbContext : DbContext, IApplicationDbContext
{
    public DataConformDbContext(DbContextOptions<DataConformDbContext> options)
        : base(options)
    {
    }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<ImportProject> ImportProjects => Set<ImportProject>();
    public DbSet<ImportFile> ImportFiles => Set<ImportFile>();
    public DbSet<ValidationIssue> ValidationIssues => Set<ValidationIssue>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DataConformDbContext).Assembly);
    }
}
