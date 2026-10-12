using DataConform.Domain.Entities;

namespace DataConform.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user, Workspace workspace);
}
