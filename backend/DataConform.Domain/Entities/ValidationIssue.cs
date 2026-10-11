using DataConform.Domain.Enums;

namespace DataConform.Domain.Entities;

public class ValidationIssue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FileId { get; set; }
    public ImportFile File { get; set; } = null!;

    public int? RowNumber { get; set; }
    public string? ColumnName { get; set; }
    public string IssueCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; } = IssueSeverity.Error;
    public string? RawValue { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
