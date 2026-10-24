using System.Security.Claims;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/register", Register)
            .WithName("Register")
            .AllowAnonymous()
            .RequireRateLimiting("AuthPolicy")
            .Produces<AuthResponseDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/login", Login)
            .WithName("Login")
            .AllowAnonymous()
            .RequireRateLimiting("AuthPolicy")
            .Produces<AuthResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapGet("/me", GetCurrentUser)
            .WithName("GetCurrentUser")
            .RequireAuthorization()
            .Produces<AuthResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> Register(
        RegisterRequestDto request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        ServiceResult<AuthResponseDto> result = await authService.RegisterAsync(request, cancellationToken);
        return result.ToHttpResult("/api/auth/me");
    }

    private static async Task<IResult> Login(
        LoginRequestDto request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        ServiceResult<AuthResponseDto> result = await authService.LoginAsync(request, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> GetCurrentUser(
        ClaimsPrincipal claimsPrincipal,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        if (!userId.HasValue)
        {
            return Results.Unauthorized();
        }

        ServiceResult<AuthResponseDto> result = await authService.GetCurrentUserAsync(userId.Value, cancellationToken);
        return result.ToHttpResult();
    }
}
