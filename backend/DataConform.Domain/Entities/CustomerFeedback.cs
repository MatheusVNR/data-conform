namespace DataConform.Domain.Entities;

public class CustomerFeedback
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public Guid? UserId { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
