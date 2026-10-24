using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly IAuditService _auditService;

    public AuthService(
        IApplicationDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _auditService = auditService;
    }

    public async Task<ServiceResult<AuthResponseDto>> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Validation,
                "O e-mail informado Ã© invÃ¡lido.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Validation,
                "A senha deve ter pelo menos 6 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Validation,
                "O nome completo Ã© obrigatÃ³rio.");
        }

        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        bool userExists = await _dbContext.Users
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (userExists)
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Conflict,
                "JÃ¡ existe um usuÃ¡rio cadastrado com este e-mail.");
        }

        string workspaceName = string.IsNullOrWhiteSpace(request.WorkspaceName)
            ? $"{request.FullName.Trim()}'s Workspace"
            : request.WorkspaceName.Trim();

        string rawSlug = Regex.Replace(workspaceName.ToLowerInvariant(), @"[^a-z0-9\-]", "-").Trim('-');
        string uniqueSlug = $"{rawSlug}-{Guid.NewGuid().ToString()[..6]}";

        Workspace workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = workspaceName,
            Slug = uniqueSlug,
            Plan = PlanTier.Starter,
            MonthlyFilesUploaded = 0,
            MonthlyFilesQuota = 20,
            MaxRowsPerFile = 1000,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Workspaces.Add(workspace);

        User user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspace.Id,
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        string token = _tokenGenerator.GenerateToken(user, workspace);

        await _auditService.LogAsync(
            workspace.Id,
            user.Id,
            "UserRegistered",
            "User",
            user.Id.ToString(),
            $"Novo usuÃ¡rio '{user.Email}' registrado com sucesso.",
            cancellationToken);

        AuthResponseDto response = MapToAuthResponse(user, workspace, token);
        return ServiceResult<AuthResponseDto>.Success(response);
    }

    public async Task<ServiceResult<AuthResponseDto>> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Validation,
                "E-mail e senha sÃ£o obrigatÃ³rios.");
        }

        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        User? user = await _dbContext.Users
            .Include(u => u.Workspace)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Unauthorized,
                "Credenciais invÃ¡lidas.");
        }

        bool isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.Unauthorized,
                "Credenciais invÃ¡lidas.");
        }

        string token = _tokenGenerator.GenerateToken(user, user.Workspace);

        await _auditService.LogAsync(
            user.WorkspaceId,
            user.Id,
            "UserLoggedIn",
            "User",
            user.Id.ToString(),
            $"UsuÃ¡rio '{user.Email}' realizou login.",
            cancellationToken);

        AuthResponseDto response = MapToAuthResponse(user, user.Workspace, token);
        return ServiceResult<AuthResponseDto>.Success(response);
    }

    public async Task<ServiceResult<AuthResponseDto>> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        User? user = await _dbContext.Users
            .Include(u => u.Workspace)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return ServiceResult<AuthResponseDto>.Failure(
                ServiceErrorType.NotFound,
                "UsuÃ¡rio nÃ£o encontrado.");
        }

        string token = _tokenGenerator.GenerateToken(user, user.Workspace);
        AuthResponseDto response = MapToAuthResponse(user, user.Workspace, token);
        return ServiceResult<AuthResponseDto>.Success(response);
    }

    private static AuthResponseDto MapToAuthResponse(User user, Workspace workspace, string token)
    {
        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            WorkspaceId = workspace.Id,
            WorkspaceName = workspace.Name,
            WorkspaceSlug = workspace.Slug,
            Plan = workspace.Plan.ToString()
        };
    }
}
