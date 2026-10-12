namespace DataConform.Application.Common.Models;

public sealed class LoginRequestDto
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
