using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence.Configurations;

public class ImportFileConfiguration : IEntityTypeConfiguration<ImportFile>
{
    public void Configure(EntityTypeBuilder<ImportFile> builder)
    {
        builder.ToTable("import_files");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.OriginalFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(f => f.StoredFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(f => f.ContentType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(f => f.ByteSize)
            .IsRequired();

        builder.Property(f => f.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(f => f.CreatedAt)
            .IsRequired();

        builder.HasIndex(f => new { f.ProjectId, f.CreatedAt });

        builder.HasMany(f => f.ValidationIssues)
            .WithOne(i => i.File)
            .HasForeignKey(i => i.FileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
