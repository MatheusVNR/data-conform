using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;

namespace DataConform.Application.Services;

public class FeedbackService : IFeedbackService
{
    private readonly IApplicationDbContext _dbContext;

    public FeedbackService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ServiceResult<CustomerFeedbackDto>> CreateFeedbackAsync(
        CreateCustomerFeedbackRequest request,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return ServiceResult<CustomerFeedbackDto>.Failure(
                ServiceErrorType.Validation,
                "A mensagem de feedback é obrigatória.");
        }

        string safeCategory = string.IsNullOrWhiteSpace(request.Category)
            ? "improvement"
            : request.Category.Trim().ToLowerInvariant();
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

        _dbContext.CustomerFeedbacks.Add(feedback);
        await _dbContext.SaveChangesAsync(cancellationToken);

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

        return ServiceResult<CustomerFeedbackDto>.Success(dto);
    }

    public async Task<List<CustomerFeedbackDto>> GetFeedbacksAsync(
        int maxRecords = 100,
        CancellationToken cancellationToken = default)
    {
        int safeLimit = Math.Clamp(maxRecords, 1, 500);

        List<CustomerFeedbackDto> list = await _dbContext.CustomerFeedbacks
            .OrderByDescending(f => f.CreatedAt)
            .Take(safeLimit)
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

        return list;
    }
}
