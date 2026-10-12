namespace DataConform.Application.Common.Models;

public sealed class AuthResponseDto
{
    public string Token { get; init; } = string.Empty;
    public Guid UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public Guid WorkspaceId { get; init; }
    public string WorkspaceName { get; init; } = string.Empty;
    public string WorkspaceSlug { get; init; } = string.Empty;
    public string Plan { get; init; } = string.Empty;
}
