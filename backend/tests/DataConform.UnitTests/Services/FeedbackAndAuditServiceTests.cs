using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Models;
using DataConform.Application.Services;
using DataConform.Domain.Entities;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class FeedbackAndAuditServiceTests
{
    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    [Fact]
    public async Task CreateFeedbackAsync_ShouldClampRatingAndPersistFeedback()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FeedbackService feedbackService = new FeedbackService(context);

        CreateCustomerFeedbackRequest request = new CreateCustomerFeedbackRequest
        {
            Category = "  NEW-ERP  ",
            Rating = 10, // Deve sofrer clamp para 5
            Subject = "Suporte a Senior ERP",
            Message = "Gostaria de homologar tabelas da Senior.",
            ContactEmail = "cliente@empresa.com.br"
        };

        ServiceResult<CustomerFeedbackDto> result = await feedbackService.CreateFeedbackAsync(request, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("new-erp", result.Data.Category);
        Assert.Equal(5, result.Data.Rating);
        Assert.Equal("Suporte a Senior ERP", result.Data.Subject);

        List<CustomerFeedbackDto> list = await feedbackService.GetFeedbacksAsync();
        Assert.Single(list);
    }

    [Fact]
    public async Task CreateFeedbackAsync_WithEmptyMessage_ShouldReturnValidationFailure()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        FeedbackService feedbackService = new FeedbackService(context);

        ServiceResult<CustomerFeedbackDto> result = await feedbackService.CreateFeedbackAsync(
            new CreateCustomerFeedbackRequest { Message = "   " },
            null);

        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task GetWorkspaceAuditLogsAsync_ShouldEnforceTenantIsolation()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        TenantAccessService tenantAccess = new TenantAccessService(context);
        AuditService auditService = new AuditService(context, tenantAccess);

        Workspace wsA = new Workspace { Id = Guid.NewGuid(), Name = "Org A", Slug = "org-a" };
        Workspace wsB = new Workspace { Id = Guid.NewGuid(), Name = "Org B", Slug = "org-b" };
        context.Workspaces.AddRange(wsA, wsB);
        await context.SaveChangesAsync();

        Guid userAId = Guid.NewGuid();
        await auditService.LogAsync(wsA.Id, userAId, "CreateProject", "ImportProject", "123", "Teste de log");

        ServiceResult<List<AuditLogDto>> allowedLogs = await auditService.GetWorkspaceAuditLogsAsync(
            wsA.Id,
            userAId,
            wsA.Id);

        Assert.True(allowedLogs.IsSuccess);
        Assert.NotNull(allowedLogs.Data);
        Assert.Single(allowedLogs.Data);

        ServiceResult<List<AuditLogDto>> forbiddenLogs = await auditService.GetWorkspaceAuditLogsAsync(
            wsB.Id,
            userAId,
            wsA.Id);

        Assert.False(forbiddenLogs.IsSuccess);
        Assert.Equal(ServiceErrorType.Forbidden, forbiddenLogs.ErrorType);
    }
}
