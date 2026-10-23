namespace DataConform.Application.Common.Models;

public class CreateCustomerFeedbackRequest
{
    public Guid? WorkspaceId { get; set; }
    public string Category { get; set; } = "improvement";
    public int Rating { get; set; } = 5;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
}

public class CustomerFeedbackDto
{
    public Guid Id { get; set; }
    public Guid? WorkspaceId { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
