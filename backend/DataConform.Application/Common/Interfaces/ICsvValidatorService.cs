using DataConform.Domain.Entities;

namespace DataConform.Application.Common.Interfaces;

public class FileValidationResult
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int ErrorRows { get; set; }
    public List<ValidationIssue> Issues { get; set; } = new List<ValidationIssue>();
}

public interface ICsvValidatorService
{
    Task<FileValidationResult> ValidateCsvStreamAsync(
        Stream csvStream,
        Guid fileId,
        IReadOnlyCollection<string>? requiredColumns = null,
        CancellationToken cancellationToken = default);
}
