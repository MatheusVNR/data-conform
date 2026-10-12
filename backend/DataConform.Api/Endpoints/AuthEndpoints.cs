using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/register", Register)
            .WithName("Register")
            .Produces<AuthResponseDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/login", Login)
            .WithName("Login")
            .Produces<AuthResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/me", GetCurrentUser)
            .WithName("GetCurrentUser")
            .RequireAuthorization()
            .Produces<AuthResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> Register(
        RegisterRequestDto request,
        IApplicationDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return Results.BadRequest(new { error = "O e-mail informado é inválido." });
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return Results.BadRequest(new { error = "A senha deve ter pelo menos 6 caracteres." });
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return Results.BadRequest(new { error = "O nome completo é obrigatório." });
        }

        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        bool userExists = await dbContext.Users
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (userExists)
        {
            return Results.Conflict(new { error = "Já existe um usuário cadastrado com este e-mail." });
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

        dbContext.Workspaces.Add(workspace);

        User user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspace.Id,
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.HashPassword(request.Password),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        string token = tokenGenerator.GenerateToken(user, workspace);

        await auditService.LogAsync(
            workspace.Id,
            user.Id,
            "UserRegistered",
            "User",
            user.Id.ToString(),
            $"Novo usuário '{user.Email}' registrado com sucesso.",
            cancellationToken);

        AuthResponseDto response = new AuthResponseDto
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

        return Results.Created("/api/auth/me", response);
    }

    private static async Task<IResult> Login(
        LoginRequestDto request,
        IApplicationDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        IAuditService auditService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest(new { error = "E-mail e senha são obrigatórios." });
        }

        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        User? user = await dbContext.Users
            .Include(u => u.Workspace)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Results.Unauthorized();
        }

        bool isPasswordValid = passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return Results.Unauthorized();
        }

        string token = tokenGenerator.GenerateToken(user, user.Workspace);

        await auditService.LogAsync(
            user.WorkspaceId,
            user.Id,
            "UserLoggedIn",
            "User",
            user.Id.ToString(),
            $"Usuário '{user.Email}' realizou login.",
            cancellationToken);

        AuthResponseDto response = new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            WorkspaceId = user.Workspace.Id,
            WorkspaceName = user.Workspace.Name,
            WorkspaceSlug = user.Workspace.Slug,
            Plan = user.Workspace.Plan.ToString()
        };

        return Results.Ok(response);
    }

    private static async Task<IResult> GetCurrentUser(
        ClaimsPrincipal claimsPrincipal,
        IApplicationDbContext dbContext,
        IJwtTokenGenerator tokenGenerator,
        CancellationToken cancellationToken)
    {
        string? userIdString = claimsPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
        {
            return Results.Unauthorized();
        }

        User? user = await dbContext.Users
            .Include(u => u.Workspace)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return Results.NotFound(new { error = "Usuário não encontrado." });
        }

        string token = tokenGenerator.GenerateToken(user, user.Workspace);

        AuthResponseDto response = new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            WorkspaceId = user.Workspace.Id,
            WorkspaceName = user.Workspace.Name,
            WorkspaceSlug = user.Workspace.Slug,
            Plan = user.Workspace.Plan.ToString()
        };

        return Results.Ok(response);
    }
}
