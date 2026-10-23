using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;

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
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return Results.BadRequest(new { error = "A mensagem de feedback é obrigatória." });
        }

        Guid? userId = null;
        string? claimSub = claimsPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(claimSub) && Guid.TryParse(claimSub, out Guid parsedUserId))
        {
            userId = parsedUserId;
        }

        string safeCategory = string.IsNullOrWhiteSpace(request.Category) ? "improvement" : request.Category.Trim().ToLowerInvariant();
        int safeRating = Math.Clamp(request.Rating, 0, 5);

        CustomerFeedback feedback = new CustomerFeedback
        {
            Id = Guid.NewGuid(),
            WorkspaceId = request.WorkspaceId,
            UserId = userId,
            Category = safeCategory.Length > 50 ? safeCategory.Substring(0, 50) : safeCategory,
            Rating = safeRating,
            Subject = string.IsNullOrWhiteSpace(request.Subject)
                ? "Feedback de Plataforma"
                : (request.Subject.Trim().Length > 200 ? request.Subject.Trim().Substring(0, 200) : request.Subject.Trim()),
            Message = request.Message.Trim().Length > 4000 ? request.Message.Trim().Substring(0, 4000) : request.Message.Trim(),
            ContactEmail = string.IsNullOrWhiteSpace(request.ContactEmail)
                ? null
                : (request.ContactEmail.Trim().Length > 255 ? request.ContactEmail.Trim().Substring(0, 255) : request.ContactEmail.Trim()),
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.CustomerFeedbacks.Add(feedback);
        await dbContext.SaveChangesAsync(cancellationToken);

        CustomerFeedbackDto dto = new CustomerFeedbackDto
        {
            Id = feedback.Id,
            WorkspaceId = feedback.WorkspaceId,
            Category = feedback.Category,
            Rating = feedback.Rating,
            Subject = feedback.Subject,
            Message = feedback.Message,
            ContactEmail = feedback.ContactEmail,
            CreatedAt = feedback.CreatedAt
        };

        return Results.Created($"/api/feedbacks/{feedback.Id}", dto);
    }

    private static async Task<IResult> GetFeedbacks(
        IApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        List<CustomerFeedbackDto> list = await dbContext.CustomerFeedbacks
            .OrderByDescending(f => f.CreatedAt)
            .Take(100)
            .Select(f => new CustomerFeedbackDto
            {
                Id = f.Id,
                WorkspaceId = f.WorkspaceId,
                Category = f.Category,
                Rating = f.Rating,
                Subject = f.Subject,
                Message = f.Message,
                ContactEmail = f.ContactEmail,
                CreatedAt = f.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(list);
    }
}
