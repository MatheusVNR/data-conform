using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Api.Endpoints;

public static class FeedbackEndpoints
{
    public static RouteGroupBuilder MapFeedbackEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/feedbacks")
            .WithTags("Feedbacks");

        group.MapPost("/", CreateFeedback)
            .WithName("CreateFeedback")
            .AllowAnonymous()
            .RequireRateLimiting("FeedbackPolicy")
            .Produces<CustomerFeedbackDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/", GetFeedbacks)
            .WithName("GetFeedbacks")
            .RequireAuthorization()
            .Produces<List<CustomerFeedbackDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> CreateFeedback(
        CreateCustomerFeedbackRequest request,
        ClaimsPrincipal claimsPrincipal,
        IFeedbackService feedbackService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        ServiceResult<CustomerFeedbackDto> result = await feedbackService.CreateFeedbackAsync(
            request,
            userId,
            cancellationToken);

        return result.ToHttpResult(result.Data != null ? $"/api/feedbacks/{result.Data.Id}" : null);
    }

    private static async Task<IResult> GetFeedbacks(
        HttpContext httpContext,
        IConfiguration configuration,
        IFeedbackService feedbackService,
        CancellationToken cancellationToken)
    {
        string? configuredAdminKey = configuration["Admin:ApiKey"];
        string? providedAdminKey = httpContext.Request.Headers["X-Admin-Key"].FirstOrDefault();

        if (!IsValidAdminKey(configuredAdminKey, providedAdminKey))
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Acesso restrito à administração",
                detail: "A listagem global de feedbacks e leads comerciais é restrita à operação administrativa autorizada.");
        }

        List<CustomerFeedbackDto> list = await feedbackService.GetFeedbacksAsync(100, cancellationToken);
        return Results.Ok(list);
    }

    private static bool IsValidAdminKey(string? configuredKey, string? providedKey)
    {
        if (string.IsNullOrWhiteSpace(configuredKey) || string.IsNullOrWhiteSpace(providedKey))
        {
            return false;
        }

        string trimmedConfigured = configuredKey.Trim();
        if (trimmedConfigured.Length < 16)
        {
            return false;
        }

        byte[] expectedBytes = Encoding.UTF8.GetBytes(trimmedConfigured);
        byte[] actualBytes = Encoding.UTF8.GetBytes(providedKey.Trim());
        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }
}
