using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence.Configurations;

public class ImportProjectConfiguration : IEntityTypeConfiguration<ImportProject>
{
    public void Configure(EntityTypeBuilder<ImportProject> builder)
    {
        builder.ToTable("import_projects");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.Description)
            .HasMaxLength(500);

        builder.Property(p => p.TargetSystem)
            .HasMaxLength(100);

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        builder.HasMany(p => p.Files)
            .WithOne(f => f.Project)
            .HasForeignKey(f => f.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
