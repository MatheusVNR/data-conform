using Microsoft.Extensions.DependencyInjection;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Services;

namespace DataConform.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ICsvValidatorService, CsvValidatorService>();
        services.AddScoped<ITenantAccessService, TenantAccessService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IWorkspaceService, WorkspaceService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        return services;
    }
}
