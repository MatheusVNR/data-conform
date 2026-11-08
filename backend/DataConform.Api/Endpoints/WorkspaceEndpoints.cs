using System.Security.Claims;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Workspaces.Dtos;

namespace DataConform.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static RouteGroupBuilder MapWorkspaceEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/workspaces")
            .WithTags("Workspaces");

        group.MapPost("/", CreateWorkspace)
            .WithName("CreateWorkspace")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/", GetWorkspaces)
            .WithName("GetWorkspaces")
            .Produces<List<WorkspaceDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", GetWorkspaceById)
            .WithName("GetWorkspaceById")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:guid}", UpdateWorkspace)
            .WithName("UpdateWorkspace")
            .RequireAuthorization()
            .Produces<WorkspaceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", DeleteWorkspace)
            .WithName("DeleteWorkspace")
            .RequireAuthorization()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{id:guid}/quota", GetWorkspaceQuota)
            .WithName("GetWorkspaceQuota")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/change-plan", ChangeWorkspacePlan)
            .WithName("ChangeWorkspacePlan")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/checkout/confirm", ConfirmStripeCheckout)
            .WithName("ConfirmStripeCheckout")
            .RequireAuthorization()
            .Produces<WorkspaceQuotaDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/billing-config", GetBillingConfig)
            .WithName("GetBillingConfig")
            .AllowAnonymous()
            .Produces<BillingConfigDto>(StatusCodes.Status200OK);

        group.MapPost("/{id:guid}/billing/checkout-session", CreateCheckoutSession)
            .WithName("CreateCheckoutSession")
            .RequireAuthorization()
            .Produces<CheckoutSessionResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/billing/portal-session", CreateBillingPortalSession)
            .WithName("CreateBillingPortalSession")
            .RequireAuthorization()
            .Produces<BillingPortalResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> CreateWorkspace(
        CreateWorkspaceRequest request,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        ServiceResult<WorkspaceDto> result = await workspaceService.CreateWorkspaceAsync(
            request,
            currentUserId,
            cancellationToken);

        return result.ToHttpResult(result.Data != null ? $"/api/workspaces/{result.Data.Id}" : null);
    }

    private static async Task<IResult> GetWorkspaces(
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        List<WorkspaceDto> list = await workspaceService.GetWorkspacesAsync(
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return Results.Ok(list);
    }

    private static async Task<IResult> GetWorkspaceById(
        Guid id,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<WorkspaceDto> result = await workspaceService.GetWorkspaceByIdAsync(
            id,
            userId,
            primaryWorkspaceId,
            cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> UpdateWorkspace(
        Guid id,
        UpdateWorkspaceRequest request,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<WorkspaceDto> result = await workspaceService.UpdateWorkspaceAsync(
            id,
            request,
            currentUserId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> DeleteWorkspace(
        Guid id,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? currentUserId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult result = await workspaceService.DeleteWorkspaceAsync(
            id,
            currentUserId,
            primaryWorkspaceId,
            cancellationToken);
        return result.ToHttpResult();
    }

    private static IResult GetBillingConfig(IWorkspaceService workspaceService)
    {
        BillingConfigDto config = workspaceService.GetBillingConfig();
        return Results.Ok(config);
    }

    private static async Task<IResult> CreateCheckoutSession(
        Guid id,
        CreateCheckoutSessionRequest request,
        HttpContext httpContext,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);
        string? customerEmail = TenantAuthorizationHelper.GetAuthenticatedUserEmail(claimsPrincipal);
        string defaultOriginUrl = ResolveOriginUrl(httpContext);

        ServiceResult<CheckoutSessionResponseDto> result = await workspaceService.CreateCheckoutSessionAsync(
            id,
            request,
            userId,
            primaryWorkspaceId,
            customerEmail,
            defaultOriginUrl,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> CreateBillingPortalSession(
        Guid id,
        CreateBillingPortalRequest request,
        HttpContext httpContext,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);
        string defaultOriginUrl = ResolveOriginUrl(httpContext);

        ServiceResult<BillingPortalResponseDto> result = await workspaceService.CreateBillingPortalSessionAsync(
            id,
            request,
            userId,
            primaryWorkspaceId,
            defaultOriginUrl,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static string ResolveOriginUrl(HttpContext httpContext)
    {
        string? originHeader = httpContext.Request.Headers.Origin.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(originHeader) &&
            Uri.TryCreate(originHeader, UriKind.Absolute, out Uri? parsedOrigin))
        {
            return $"{parsedOrigin.Scheme}://{parsedOrigin.Authority}";
        }

        return $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    }

    private static async Task<IResult> GetWorkspaceQuota(
        Guid id,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<WorkspaceQuotaDto> result = await workspaceService.GetWorkspaceQuotaAsync(
            id,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> ChangeWorkspacePlan(
        Guid id,
        UpdatePlanRequest request,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<WorkspaceQuotaDto> result = await workspaceService.ChangeWorkspacePlanAsync(
            id,
            request,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> ConfirmStripeCheckout(
        Guid id,
        ConfirmCheckoutRequest request,
        ClaimsPrincipal claimsPrincipal,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<WorkspaceQuotaDto> result = await workspaceService.ConfirmStripeCheckoutAsync(
            id,
            request,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }
}
