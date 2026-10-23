using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Persistence.Configurations;

public class CustomerFeedbackConfiguration : IEntityTypeConfiguration<CustomerFeedback>
{
    public void Configure(EntityTypeBuilder<CustomerFeedback> builder)
    {
        builder.ToTable("customer_feedbacks");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(f => f.Rating)
            .IsRequired();

        builder.Property(f => f.Subject)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Message)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(f => f.ContactEmail)
            .HasMaxLength(255);

        builder.Property(f => f.CreatedAt)
            .IsRequired();

        builder.HasIndex(f => f.CreatedAt);
        builder.HasIndex(f => f.Category);
    }
}
