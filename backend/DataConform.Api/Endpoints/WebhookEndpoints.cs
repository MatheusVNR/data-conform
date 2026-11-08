using System.Text;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;

namespace DataConform.Api.Endpoints;

public static class WebhookEndpoints
{
    public static RouteGroupBuilder MapWebhookEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/webhooks")
            .WithTags("Webhooks");

        group.MapPost("/stripe", HandleStripeWebhook)
            .WithName("HandleStripeWebhook")
            .AllowAnonymous()
            .RequireRateLimiting("WebhookPolicy")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        return group;
    }

    private static async Task<IResult> HandleStripeWebhook(
        HttpContext httpContext,
        IWorkspaceService workspaceService,
        CancellationToken cancellationToken)
    {
        string rawBody;
        using (StreamReader reader = new StreamReader(httpContext.Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, bufferSize: 4096, leaveOpen: true))
        {
            rawBody = await reader.ReadToEndAsync(cancellationToken);
        }

        string? signatureHeader = httpContext.Request.Headers["Stripe-Signature"].FirstOrDefault();

        ServiceResult result = await workspaceService.HandleStripeWebhookAsync(
            rawBody,
            signatureHeader,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return Results.BadRequest(new { error = result.ErrorMessage ?? "Webhook inválido." });
        }

        return Results.Ok(new { received = true });
    }
}
