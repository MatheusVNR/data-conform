using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence.Configurations;

public class WorkspaceConfiguration : IEntityTypeConfiguration<Workspace>
{
    public void Configure(EntityTypeBuilder<Workspace> builder)
    {
        builder.ToTable("workspaces");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(w => w.Slug)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(w => w.Slug)
            .IsUnique();

        builder.Property(w => w.OwnerUserId)
            .IsRequired(false);

        builder.HasIndex(w => w.OwnerUserId);

        builder.Property(w => w.CreatedAt)
            .IsRequired();

        builder.Property(w => w.Plan)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(w => w.MonthlyFilesUploaded)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(w => w.MonthlyFilesQuota)
            .IsRequired()
            .HasDefaultValue(20);

        builder.Property(w => w.MaxRowsPerFile)
            .IsRequired()
            .HasDefaultValue(1000);

        builder.HasMany(w => w.Projects)
            .WithOne(p => p.Workspace)
            .HasForeignKey(p => p.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Users)
            .WithOne(u => u.Workspace)
            .HasForeignKey(u => u.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.AuditLogs)
            .WithOne(a => a.Workspace)
            .HasForeignKey(a => a.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
