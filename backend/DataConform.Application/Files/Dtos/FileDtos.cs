using DataConform.Domain.Enums;

namespace DataConform.Application.Files.Dtos;

public class ImportFileDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long ByteSize { get; set; }
    public FileStatus Status { get; set; }
    public int? TotalRows { get; set; }
    public int? ValidRows { get; set; }
    public int? ErrorRows { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
}

public class ValidationIssueDto
{
    public Guid Id { get; set; }
    public int? RowNumber { get; set; }
    public string? ColumnName { get; set; }
    public string IssueCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; }
    public string? RawValue { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class ValidationReportDto
{
    public Guid FileId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public FileStatus Status { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ErrorRows { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public IReadOnlyCollection<ValidationIssueDto> Issues { get; set; } = Array.Empty<ValidationIssueDto>();
}
