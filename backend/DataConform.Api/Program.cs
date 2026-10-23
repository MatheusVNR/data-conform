using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using DataConform.Api.Endpoints;
using DataConform.Api.Filters;
using DataConform.Api.Services;
using DataConform.Application;
using DataConform.Application.Common.Interfaces;
using DataConform.Infrastructure;
using DataConform.Infrastructure.Persistence;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpContextCurrentUserService>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

string jwtSecret = builder.Configuration["Jwt:Secret"] ?? "DataConformSuperSecretJwtKey2026WithSufficientLengthForHmacSha256SecurityStandards!";
string jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DataConform";
string jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DataConform";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// Default-Deny Security Architecture: toda rota exige usuário autenticado por padrão (a menos que declare .AllowAnonymous())
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Muitas tentativas de autenticação em curto período. Aguarde um minuto antes de tentar novamente."
        }, cancellationToken);
    };

    options.AddPolicy("AuthPolicy", httpContext =>
    {
        string partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous-ip";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });
});

string allowedOriginsConfig = builder.Configuration["Cors:AllowedOrigins"] ?? "";
string[] allowedOrigins = string.IsNullOrWhiteSpace(allowedOriginsConfig)
    ? new string[] { "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000" }
    : allowedOriginsConfig.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (allowedOrigins.Length == 1 && allowedOrigins[0] == "*")
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

WebApplication app = builder.Build();

// Auto-migrate database on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    ILogger<Program> logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    DataConformDbContext dbContext = scope.ServiceProvider.GetRequiredService<DataConformDbContext>();
    bool autoMigrate = builder.Configuration.GetValue<bool>("Database:AutoMigrate", true);
    if (autoMigrate)
    {
        string? dbDataSource = dbContext.Database.GetDbConnection().DataSource;
        logger.LogInformation("Iniciando migrações no banco de dados em: {DataSource}", dbDataSource);

        for (int attempt = 1; attempt <= 5; attempt++)
        {
            try
            {
                logger.LogInformation("Aplicando migrações no banco de dados (tentativa {Attempt})...", attempt);
                dbContext.Database.Migrate();
                logger.LogInformation("Migrações aplicadas com sucesso.");
                break;
            }
            catch (Exception ex) when (attempt < 5)
            {
                logger.LogWarning(ex, "Falha ao conectar no banco para migrações. Nova tentativa em 3 segundos...");
                Thread.Sleep(3000);
            }
        }
    }
}

// Security Headers & Global Exception Handling Middleware (RFC 7807 ProblemDetails / CWE-209)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

    try
    {
        await next();
    }
    catch (BadHttpRequestException badRequestEx)
    {
        ILogger<Program> reqLogger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        reqLogger.LogWarning(badRequestEx, "Requisição HTTP malformada em {Path}", context.Request.Path);

        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json; charset=utf-8";
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                title = "Requisição Inválida",
                status = StatusCodes.Status400BadRequest,
                detail = "O corpo da requisição (JSON) ou os parâmetros enviados estão malformados ou inválidos.",
                error = "O corpo da requisição (JSON) ou os parâmetros enviados estão malformados ou inválidos."
            });
        }
    }
    catch (Exception unhandledEx)
    {
        ILogger<Program> errLogger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        errLogger.LogError(unhandledEx, "Erro interno não tratado em {Path}", context.Request.Path);

        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json; charset=utf-8";
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                title = "Erro Interno no Servidor",
                status = StatusCodes.Status500InternalServerError,
                detail = "Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente em instantes.",
                error = "Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente em instantes."
            });
        }
    }
});

// Configure the HTTP request pipeline.
app.MapOpenApi().AllowAnonymous();

app.MapGet("/docs", () => Results.Content(
    """
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DataConform API — Documentação Interativa (OpenAPI)</title>
        <style>body { margin: 0; padding: 0; }</style>
      </head>
      <body>
        <script id="api-reference" data-url="/openapi/v1.json" data-configuration='{"theme":"deepSpace"}'></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
    """,
    "text/html; charset=utf-8"))
    .AllowAnonymous()
    .ExcludeFromDescription();

app.MapGet("/scalar", () => Results.Redirect("/docs"))
    .AllowAnonymous()
    .ExcludeFromDescription();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Map Health & Functional Endpoints (Protected by Global FallbackPolicy + TenantIsolationEndpointFilter)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "DataConform.Api", timestamp = DateTime.UtcNow }))
    .AllowAnonymous();

RouteGroupBuilder apiGroup = app.MapGroup("")
    .AddEndpointFilter<TenantIsolationEndpointFilter>();

apiGroup.MapAuthEndpoints();
apiGroup.MapWorkspaceEndpoints();
apiGroup.MapProjectEndpoints();
apiGroup.MapFileEndpoints();
apiGroup.MapAuditEndpoints();
apiGroup.MapFeedbackEndpoints();

app.Run();
