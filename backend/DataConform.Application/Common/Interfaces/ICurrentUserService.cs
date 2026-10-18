namespace DataConform.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? PrimaryWorkspaceId { get; }
    bool IsAuthenticated { get; }
}
