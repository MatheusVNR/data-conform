using DataConform.Domain.Enums;

namespace DataConform.Domain.Entities;

public class Workspace
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public PlanTier Plan { get; set; } = PlanTier.Starter;
    public Guid? OwnerUserId { get; set; }
    public int MonthlyFilesUploaded { get; set; } = 0;
    public int MonthlyFilesQuota { get; set; } = 5;
    public int MaxRowsPerFile { get; set; } = 500;

    public ICollection<ImportProject> Projects { get; set; } = new List<ImportProject>();
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
