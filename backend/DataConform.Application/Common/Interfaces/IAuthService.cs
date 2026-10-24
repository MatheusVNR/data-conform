using DataConform.Application.Common.Models;

namespace DataConform.Application.Common.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResponseDto>> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<AuthResponseDto>> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<AuthResponseDto>> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
