using DataConform.Domain.Enums;

namespace DataConform.Domain.Entities;

public class ImportFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public ImportProject Project { get; set; } = null!;

    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long ByteSize { get; set; }

    public FileStatus Status { get; set; } = FileStatus.Pending;
    public int? TotalRows { get; set; }
    public int? ValidRows { get; set; }
    public int? ErrorRows { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }

    public ICollection<ValidationIssue> ValidationIssues { get; set; } = new List<ValidationIssue>();
}
