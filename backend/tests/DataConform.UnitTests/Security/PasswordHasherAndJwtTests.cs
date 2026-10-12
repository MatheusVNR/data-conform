using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Security;

namespace DataConform.UnitTests.Security;

public class PasswordHasherAndJwtTests
{
    [Fact]
    public void HashPassword_And_VerifyPassword_ShouldValidateCorrectly()
    {
        PasswordHasher hasher = new PasswordHasher();
        string rawPassword = "StrongPassword123!";

        string hash = hasher.HashPassword(rawPassword);

        Assert.NotNull(hash);
        Assert.Contains(":", hash);
        Assert.True(hasher.VerifyPassword(rawPassword, hash));
        Assert.False(hasher.VerifyPassword("WrongPassword", hash));
    }

    [Fact]
    public void GenerateToken_ShouldIncludeExpectedClaims()
    {
        Dictionary<string, string?> inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "AStrongEnoughSecretKeyForTestingTokensWithAtLeast256BitsLong!" },
            { "Jwt:Issuer", "DataConformTest" },
            { "Jwt:Audience", "DataConformTest" },
            { "Jwt:ExpirationInMinutes", "60" }
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        JwtTokenGenerator tokenGenerator = new JwtTokenGenerator(configuration);

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = "Acme Corp",
            Slug = "acme-corp",
            Plan = PlanTier.Professional
        };

        User user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspace.Id,
            Email = "admin@acme.com",
            FullName = "Acme Admin",
            Role = UserRole.Admin
        };

        string tokenString = tokenGenerator.GenerateToken(user, workspace);

        Assert.False(string.IsNullOrWhiteSpace(tokenString));

        JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();
        JwtSecurityToken jsonToken = handler.ReadJwtToken(tokenString);

        string? emailClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
        string? roleClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        string? workspaceIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "workspace_id")?.Value;
        string? planClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "workspace_plan")?.Value;

        Assert.Equal("admin@acme.com", emailClaim);
        Assert.Equal("Admin", roleClaim);
        Assert.Equal(workspace.Id.ToString(), workspaceIdClaim);
        Assert.Equal("Professional", planClaim);
    }
}
