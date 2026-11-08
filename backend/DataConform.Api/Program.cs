using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using DataConform.Api.Endpoints;
using DataConform.Api.Filters;
using DataConform.Api.Services;
using DataConform.Application;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Security;
using DataConform.Infrastructure.Services;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

const long maxUploadRequestBytes = 52L * 1024L * 1024L;
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = maxUploadRequestBytes;
});

builder.Services.Configure<FormOptions>(formOptions =>
{
    formOptions.MultipartBodyLengthLimit = maxUploadRequestBytes;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Add services to the container.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpContextCurrentUserService>();
builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpClient<IStripeBillingService, StripeBillingService>();
builder.Services.AddHostedService<EphemeralStorageCleanupService>();

string jwtSecret = JwtTokenGenerator.ResolveSecretKey(
    builder.Configuration,
    builder.Environment.IsProduction());
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
            title = "Limite de Requisições Excedido",
            status = StatusCodes.Status429TooManyRequests,
            detail = "Muitas solicitações em curto período. Aguarde até um minuto antes de tentar novamente.",
            error = "Muitas solicitações em curto período. Aguarde até um minuto antes de tentar novamente."
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

    options.AddPolicy("FeedbackPolicy", httpContext =>
    {
        string partitionKey = $"feedback:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous-ip"}";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("UploadValidatePolicy", httpContext =>
    {
        string? userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        string identityKey = !string.IsNullOrWhiteSpace(userId)
            ? $"user:{userId}"
            : $"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous-ip"}";

        return RateLimitPartition.GetFixedWindowLimiter(
            identityKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    options.AddPolicy("WebhookPolicy", httpContext =>
    {
        string partitionKey = $"webhook:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "stripe-ip"}";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
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

// Auto-migrate database & recover interrupted validations on startup
if (!EF.IsDesignTime)
{
    using IServiceScope scope = app.Services.CreateScope();
    ILogger<Program> logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    DataConformDbContext dbContext = scope.ServiceProvider.GetRequiredService<DataConformDbContext>();
    bool autoMigrate = builder.Configuration.GetValue<bool>("Database:AutoMigrate", true);
    if (autoMigrate && dbContext.Database.IsRelational())
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

    try
    {
        List<ImportFile> interruptedFiles = dbContext.ImportFiles
            .IgnoreQueryFilters()
            .Where(f => f.Status == FileStatus.Processing)
            .ToList();

        if (interruptedFiles.Count > 0)
        {
            foreach (ImportFile stuckFile in interruptedFiles)
            {
                stuckFile.Status = FileStatus.Failed;
            }

            dbContext.SaveChanges();
            logger.LogWarning(
                "Recuperação na inicialização: {Count} arquivo(s) interrompido(s) em Processing foram marcados como Failed.",
                interruptedFiles.Count);
        }
    }
    catch (Exception recoveryEx)
    {
        logger.LogWarning(recoveryEx, "Aviso não bloqueante ao verificar arquivos interrompidos na inicialização.");
    }
}

app.UseForwardedHeaders();

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
        reqLogger.LogWarning(badRequestEx, "Requisição HTTP rejeitada ({StatusCode}) em {Path}", badRequestEx.StatusCode, context.Request.Path);

        if (!context.Response.HasStarted)
        {
            if (badRequestEx.StatusCode == StatusCodes.Status413PayloadTooLarge)
            {
                context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                context.Response.ContentType = "application/problem+json; charset=utf-8";
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc9110#section-15.5.14",
                    title = "Arquivo Muito Grande",
                    status = StatusCodes.Status413PayloadTooLarge,
                    detail = "O arquivo enviado excede o tamanho máximo suportado pelo servidor (50 MB).",
                    error = "O arquivo enviado excede o tamanho máximo suportado pelo servidor (50 MB)."
                });
            }
            else
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

app.UseResponseCompression();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Map Health & Public Webhook Endpoints
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "DataConform.Api", timestamp = DateTime.UtcNow }))
    .AllowAnonymous();

app.MapGet("/health/ready", async (DataConformDbContext dbContext, CancellationToken cancellationToken) =>
{
    bool dbHealthy = await dbContext.Database.CanConnectAsync(cancellationToken);
    if (!dbHealthy)
    {
        return Results.Json(
            new { status = "degraded", database = "unreachable", timestamp = DateTime.UtcNow },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.Ok(new { status = "ready", database = "connected", timestamp = DateTime.UtcNow });
}).AllowAnonymous();

app.MapWebhookEndpoints();

RouteGroupBuilder apiGroup = app.MapGroup("")
    .AddEndpointFilter<TenantIsolationEndpointFilter>();

apiGroup.MapAuthEndpoints();
apiGroup.MapWorkspaceEndpoints();
apiGroup.MapProjectEndpoints();
apiGroup.MapFileEndpoints();
apiGroup.MapAuditEndpoints();
apiGroup.MapFeedbackEndpoints();

app.Run();
