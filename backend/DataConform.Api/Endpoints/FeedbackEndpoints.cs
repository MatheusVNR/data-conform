using System.Security.Claims;
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
            .RequireRateLimiting("AuthPolicy")
            .Produces<CustomerFeedbackDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/", GetFeedbacks)
            .WithName("GetFeedbacks")
            .RequireAuthorization()
            .Produces<List<CustomerFeedbackDto>>(StatusCodes.Status200OK);

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
        IFeedbackService feedbackService,
        CancellationToken cancellationToken)
    {
        List<CustomerFeedbackDto> list = await feedbackService.GetFeedbacksAsync(100, cancellationToken);
        return Results.Ok(list);
    }
}
