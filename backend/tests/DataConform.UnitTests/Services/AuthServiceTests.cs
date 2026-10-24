using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Models;
using DataConform.Application.Services;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Security;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class AuthServiceTests
{
    private static DataConformDbContext CreateInMemoryContext()
    {
        DbContextOptions<DataConformDbContext> options = new DbContextOptionsBuilder<DataConformDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DataConformDbContext(options);
    }

    private static AuthService CreateAuthService(DataConformDbContext context)
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

        PasswordHasher hasher = new PasswordHasher();
        JwtTokenGenerator tokenGenerator = new JwtTokenGenerator(configuration);
        TenantAccessService tenantAccess = new TenantAccessService(context);
        AuditService auditService = new AuditService(context, tenantAccess);

        return new AuthService(context, hasher, tokenGenerator, auditService);
    }

    [Fact]
    public async Task RegisterAsync_WithValidRequest_ShouldCreateWorkspaceUserTokenAndAuditLog()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        RegisterRequestDto request = new RegisterRequestDto
        {
            Email = "  Admin@EmpresaTeste.com.br  ",
            Password = "SenhaForte123!",
            FullName = "Carlos Almeida",
            WorkspaceName = "Empresa Teste S.A."
        };

        ServiceResult<AuthResponseDto> result = await authService.RegisterAsync(request);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("admin@empresateste.com.br", result.Data.Email);
        Assert.Equal("Carlos Almeida", result.Data.FullName);
        Assert.Equal("Empresa Teste S.A.", result.Data.WorkspaceName);
        Assert.Equal("Starter", result.Data.Plan);
        Assert.False(string.IsNullOrWhiteSpace(result.Data.Token));

        int auditCount = await context.AuditLogs.CountAsync(a => a.Action == "UserRegistered");
        Assert.Equal(1, auditCount);
    }

    [Fact]
    public async Task RegisterAsync_WithDuplicateEmail_ShouldReturnConflict()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        RegisterRequestDto request = new RegisterRequestDto
        {
            Email = "duplicado@empresa.com",
            Password = "SenhaForte123!",
            FullName = "Usuário 1"
        };

        ServiceResult<AuthResponseDto> firstResult = await authService.RegisterAsync(request);
        Assert.True(firstResult.IsSuccess);

        ServiceResult<AuthResponseDto> secondResult = await authService.RegisterAsync(request);
        Assert.False(secondResult.IsSuccess);
        Assert.Equal(ServiceErrorType.Conflict, secondResult.ErrorType);
    }

    [Theory]
    [InlineData("email-invalido", "123456", "Nome Valido")]
    [InlineData("valido@empresa.com", "123", "Nome Valido")]
    [InlineData("valido@empresa.com", "123456", "")]
    public async Task RegisterAsync_WithInvalidFields_ShouldReturnValidationFailure(
        string email,
        string password,
        string fullName)
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        RegisterRequestDto request = new RegisterRequestDto
        {
            Email = email,
            Password = password,
            FullName = fullName
        };

        ServiceResult<AuthResponseDto> result = await authService.RegisterAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ShouldReturnSuccessWithJwt()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        await authService.RegisterAsync(new RegisterRequestDto
        {
            Email = "login@empresa.com",
            Password = "Password123!",
            FullName = "Maria Oliveira"
        });

        ServiceResult<AuthResponseDto> loginResult = await authService.LoginAsync(new LoginRequestDto
        {
            Email = "LOGIN@empresa.com",
            Password = "Password123!"
        });

        Assert.True(loginResult.IsSuccess);
        Assert.NotNull(loginResult.Data);
        Assert.Equal("login@empresa.com", loginResult.Data.Email);
        Assert.False(string.IsNullOrWhiteSpace(loginResult.Data.Token));
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ShouldReturnUnauthorized()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        await authService.RegisterAsync(new RegisterRequestDto
        {
            Email = "user@empresa.com",
            Password = "Password123!",
            FullName = "João Silva"
        });

        ServiceResult<AuthResponseDto> loginResult = await authService.LoginAsync(new LoginRequestDto
        {
            Email = "user@empresa.com",
            Password = "WrongPassword!"
        });

        Assert.False(loginResult.IsSuccess);
        Assert.Equal(ServiceErrorType.Unauthorized, loginResult.ErrorType);
    }

    [Fact]
    public async Task GetCurrentUserAsync_WhenUserExistsAndWhenNotFound_ShouldHandleBothCases()
    {
        using DataConformDbContext context = CreateInMemoryContext();
        AuthService authService = CreateAuthService(context);

        ServiceResult<AuthResponseDto> registered = await authService.RegisterAsync(new RegisterRequestDto
        {
            Email = "me@empresa.com",
            Password = "Password123!",
            FullName = "Ana Costa"
        });

        Assert.NotNull(registered.Data);

        ServiceResult<AuthResponseDto> foundResult = await authService.GetCurrentUserAsync(registered.Data.UserId);
        Assert.True(foundResult.IsSuccess);
        Assert.Equal("me@empresa.com", foundResult.Data?.Email);

        ServiceResult<AuthResponseDto> missingResult = await authService.GetCurrentUserAsync(Guid.NewGuid());
        Assert.False(missingResult.IsSuccess);
        Assert.Equal(ServiceErrorType.NotFound, missingResult.ErrorType);
    }
}
