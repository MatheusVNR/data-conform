using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;

namespace DataConform.Application.Common.Interfaces;

public interface IWorkspaceService
{
    Task<ServiceResult<WorkspaceDto>> CreateWorkspaceAsync(
        CreateWorkspaceRequest request,
        Guid? currentUserId,
        CancellationToken cancellationToken = default);

    Task<List<WorkspaceDto>> GetWorkspacesAsync(
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceDto>> GetWorkspaceByIdAsync(
        Guid id,
        Guid? userId = null,
        Guid? primaryWorkspaceId = null,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceDto>> UpdateWorkspaceAsync(
        Guid id,
        UpdateWorkspaceRequest request,
        Guid? currentUserId,
        Guid? primaryWorkspaceId = null,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> DeleteWorkspaceAsync(
        Guid id,
        Guid? currentUserId = null,
        Guid? primaryWorkspaceId = null,
        CancellationToken cancellationToken = default);

    BillingConfigDto GetBillingConfig();

    Task<ServiceResult<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(
        Guid id,
        CreateCheckoutSessionRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        string? customerEmail,
        string defaultOriginUrl,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<BillingPortalResponseDto>> CreateBillingPortalSessionAsync(
        Guid id,
        CreateBillingPortalRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        string defaultOriginUrl,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> GetWorkspaceQuotaAsync(
        Guid id,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> ChangeWorkspacePlanAsync(
        Guid id,
        UpdatePlanRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<WorkspaceQuotaDto>> ConfirmStripeCheckoutAsync(
        Guid id,
        ConfirmCheckoutRequest request,
        Guid? userId,
        Guid? primaryWorkspaceId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult> HandleStripeWebhookAsync(
        string rawPayload,
        string? stripeSignatureHeader,
        CancellationToken cancellationToken = default);
}
