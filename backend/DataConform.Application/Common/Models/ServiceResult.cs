namespace DataConform.Application.Common.Models;

public enum ServiceErrorType
{
    None = 0,
    Validation = 1,
    Unauthorized = 2,
    Forbidden = 3,
    NotFound = 4,
    Conflict = 5,
    QuotaExceeded = 6,
    InternalError = 7
}

public class ServiceResult
{
    public bool IsSuccess { get; init; }
    public ServiceErrorType ErrorType { get; init; }
    public string? ErrorTitle { get; init; }
    public string? ErrorMessage { get; init; }

    public static ServiceResult Success()
    {
        return new ServiceResult
        {
            IsSuccess = true,
            ErrorType = ServiceErrorType.None
        };
    }

    public static ServiceResult Failure(ServiceErrorType errorType, string message, string? title = null)
    {
        return new ServiceResult
        {
            IsSuccess = false,
            ErrorType = errorType,
            ErrorMessage = message,
            ErrorTitle = title
        };
    }
}

public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; init; }

    public static ServiceResult<T> Success(T data)
    {
        return new ServiceResult<T>
        {
            IsSuccess = true,
            ErrorType = ServiceErrorType.None,
            Data = data
        };
    }

    public new static ServiceResult<T> Failure(ServiceErrorType errorType, string message, string? title = null)
    {
        return new ServiceResult<T>
        {
            IsSuccess = false,
            ErrorType = errorType,
            ErrorMessage = message,
            ErrorTitle = title
        };
    }
}
