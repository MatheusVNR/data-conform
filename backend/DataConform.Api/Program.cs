using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using DataConform.Api.Endpoints;
using DataConform.Application;
using DataConform.Infrastructure;
using DataConform.Infrastructure.Persistence;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
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
builder.Services.AddAuthorization();

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

// Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Map Health & Functional Endpoints
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "DataConform.Api", timestamp = DateTime.UtcNow }));

app.MapAuthEndpoints();
app.MapWorkspaceEndpoints();
app.MapProjectEndpoints();
app.MapFileEndpoints();
app.MapAuditEndpoints();

app.Run();
