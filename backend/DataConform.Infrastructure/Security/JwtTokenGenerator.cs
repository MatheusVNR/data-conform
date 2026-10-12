using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;

namespace DataConform.Infrastructure.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, Workspace workspace)
    {
        string secretKey = _configuration["Jwt:Secret"] ?? "DataConformSuperSecretJwtKey2026WithSufficientLengthForHmacSha256!";
        string issuer = _configuration["Jwt:Issuer"] ?? "DataConform";
        string audience = _configuration["Jwt:Audience"] ?? "DataConform";
        int expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationInMinutes"], out int exp) ? exp : 1440;

        byte[] keyBytes = Encoding.UTF8.GetBytes(secretKey);
        SymmetricSecurityKey key = new SymmetricSecurityKey(keyBytes);
        SigningCredentials credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        Claim[] claims = new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("workspace_id", workspace.Id.ToString()),
            new Claim("workspace_slug", workspace.Slug),
            new Claim("workspace_plan", workspace.Plan.ToString())
        };

        DateTime expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        JwtSecurityToken token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }
}
