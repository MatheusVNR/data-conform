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
    public const string DevelopmentFallbackSecret =
        "DataConformDevOnlyJwtKey2026WithMinimum64CharactersForHmacSha256Security!";

    private static readonly HashSet<string> KnownDevelopmentSecrets = new HashSet<string>(StringComparer.Ordinal)
    {
        DevelopmentFallbackSecret,
        "DataConformSuperSecretJwtKey2026WithSufficientLengthForHmacSha256SecurityStandards!",
        "DataConformSuperSecretJwtKey2026WithSufficientLengthForHmacSha256!"
    };

    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public static string ResolveSecretKey(IConfiguration configuration, bool isProductionEnvironment = false)
    {
        string? configuredSecret = configuration["Jwt:Secret"];
        string environmentName = configuration["ASPNETCORE_ENVIRONMENT"]
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";

        bool enforceProductionSecret = isProductionEnvironment ||
            string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase);

        if (enforceProductionSecret)
        {
            if (string.IsNullOrWhiteSpace(configuredSecret) ||
                configuredSecret.Trim().Length < 32 ||
                KnownDevelopmentSecrets.Contains(configuredSecret.Trim()))
            {
                throw new InvalidOperationException(
                    "Configuração crítica de segurança inválida: defina uma chave exclusiva e forte em Jwt:Secret (mínimo de 32 caracteres) no ambiente de Produção.");
            }

            return configuredSecret.Trim();
        }

        if (string.IsNullOrWhiteSpace(configuredSecret))
        {
            return DevelopmentFallbackSecret;
        }

        string trimmed = configuredSecret.Trim();
        if (trimmed.Length < 32)
        {
            throw new InvalidOperationException(
                "A chave Jwt:Secret deve conter no mínimo 32 caracteres para assinatura HMAC-SHA256.");
        }

        return trimmed;
    }

    public string GenerateToken(User user, Workspace workspace)
    {
        string secretKey = ResolveSecretKey(_configuration);
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
