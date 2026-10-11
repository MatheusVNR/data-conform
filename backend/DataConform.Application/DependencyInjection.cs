using Microsoft.Extensions.DependencyInjection;

namespace DataConform.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Registro de serviços da camada Application (casos de uso, validadores, etc.)
        return services;
    }
}
