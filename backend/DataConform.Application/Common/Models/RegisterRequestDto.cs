namespace DataConform.Application.Common.Models;

public sealed class RegisterRequestDto
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? WorkspaceName { get; init; }
    public string? ErpPreset { get; init; }
    public string? AttributionJson { get; init; }
}
