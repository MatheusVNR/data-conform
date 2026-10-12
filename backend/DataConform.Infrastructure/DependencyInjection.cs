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
        string? connectionString = configuration.GetConnectionString("DefaultConnection");

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
