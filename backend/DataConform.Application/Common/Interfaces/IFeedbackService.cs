using DataConform.Application.Common.Models;

namespace DataConform.Application.Common.Interfaces;

public interface IFeedbackService
{
    Task<ServiceResult<CustomerFeedbackDto>> CreateFeedbackAsync(
        CreateCustomerFeedbackRequest request,
        Guid? userId,
        CancellationToken cancellationToken = default);

    Task<List<CustomerFeedbackDto>> GetFeedbacksAsync(
        int maxRecords = 100,
        CancellationToken cancellationToken = default);
}
