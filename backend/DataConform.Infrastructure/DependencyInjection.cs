using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using DataConform.Application.Common.Interfaces;
using DataConform.Infrastructure.Persistence;
using DataConform.Infrastructure.Services;

namespace DataConform.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        string? envDbUrl = configuration["DATABASE_URL"]
            ?? Environment.GetEnvironmentVariable("DATABASE_URL");

        string? defaultConnection = configuration.GetConnectionString("DefaultConnection");

        // DATABASE_URL fornecida por provedores de nuvem (Render/Railway) tem prioridade sobre o fallback do appsettings.json
        string? connectionString = !string.IsNullOrWhiteSpace(envDbUrl)
            ? envDbUrl
            : defaultConnection;

        if (!string.IsNullOrWhiteSpace(connectionString) &&
            (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
             connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
        {
            Uri uri = new Uri(connectionString);
            string[] userInfo = uri.UserInfo.Split(':');
            string username = Uri.UnescapeDataString(userInfo[0]);
            string password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            int port = uri.Port > 0 ? uri.Port : 5432;
            string database = uri.AbsolutePath.TrimStart('/');

            connectionString = $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Prefer;Trust Server Certificate=true";
        }

        services.AddDbContext<DataConformDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(DataConformDbContext).Assembly.FullName);
            });
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<DataConformDbContext>());
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddSingleton<IPasswordHasher, Security.PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, Security.JwtTokenGenerator>();
        services.AddScoped<ISubscriptionQuotaService, SubscriptionQuotaService>();
        services.AddScoped<IAuditService, AuditService>();

        return services;
    }
}
