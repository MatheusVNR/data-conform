using DataConform.Application.Common.Models;

namespace DataConform.Api.Endpoints;

public static class EndpointResultExtensions
{
    public static IResult ToHttpResult(this ServiceResult result)
    {
        if (result.IsSuccess)
        {
            return Results.NoContent();
        }

        return MapFailureResult(result.ErrorType, result.ErrorMessage, result.ErrorTitle);
    }

    public static IResult ToHttpResult<T>(this ServiceResult<T> result, string? createdLocation = null)
    {
        if (result.IsSuccess)
        {
            if (!string.IsNullOrWhiteSpace(createdLocation))
            {
                return Results.Created(createdLocation, result.Data);
            }

            return Results.Ok(result.Data);
        }

        return MapFailureResult(result.ErrorType, result.ErrorMessage, result.ErrorTitle);
    }

    private static IResult MapFailureResult(ServiceErrorType errorType, string? errorMessage, string? errorTitle)
    {
        string safeMessage = errorMessage ?? "Ocorreu um erro ao processar a solicitação.";

        return errorType switch
        {
            ServiceErrorType.Validation => Results.BadRequest(new { error = safeMessage }),
            ServiceErrorType.Unauthorized => Results.Unauthorized(),
            ServiceErrorType.Forbidden => Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: errorTitle ?? "Acesso negado à organização",
                detail: safeMessage),
            ServiceErrorType.QuotaExceeded => Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: errorTitle ?? "Limite do plano atingido",
                detail: safeMessage),
            ServiceErrorType.NotFound => Results.NotFound(new { error = safeMessage }),
            ServiceErrorType.Conflict => Results.Conflict(new { error = safeMessage }),
            _ => Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: errorTitle ?? "Falha ao processar a solicitação",
                detail: safeMessage)
        };
    }
}
