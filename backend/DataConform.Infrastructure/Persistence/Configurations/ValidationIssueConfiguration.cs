using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence.Configurations;

public class ValidationIssueConfiguration : IEntityTypeConfiguration<ValidationIssue>
{
    public void Configure(EntityTypeBuilder<ValidationIssue> builder)
    {
        builder.ToTable("validation_issues");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.RowNumber);

        builder.Property(i => i.ColumnName)
            .HasMaxLength(100);

        builder.Property(i => i.IssueCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(i => i.Message)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(i => i.Severity)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(i => i.RawValue)
            .HasMaxLength(1000);

        builder.Property(i => i.CreatedAt)
            .IsRequired();

        builder.HasIndex(i => new { i.FileId, i.Severity });
        builder.HasIndex(i => new { i.FileId, i.RowNumber });
    }
}
