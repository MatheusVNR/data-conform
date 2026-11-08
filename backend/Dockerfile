# ==============================================================================
# DataConform API - Multi-stage Dockerfile (.NET 10)
# ==============================================================================

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files for dependency restore caching
COPY DataConform.sln ./
COPY DataConform.Domain/DataConform.Domain.csproj DataConform.Domain/
COPY DataConform.Application/DataConform.Application.csproj DataConform.Application/
COPY DataConform.Infrastructure/DataConform.Infrastructure.csproj DataConform.Infrastructure/
COPY DataConform.Api/DataConform.Api.csproj DataConform.Api/
COPY tests/DataConform.UnitTests/DataConform.UnitTests.csproj tests/DataConform.UnitTests/

RUN dotnet restore DataConform.sln

# Copy the remaining source files
COPY . .

# Publish the API in Release mode
RUN dotnet publish DataConform.Api/DataConform.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV FileStorage__BasePath=/app/storage/uploads

RUN mkdir -p /app/storage/uploads && chmod 775 /app/storage/uploads

EXPOSE 8080

COPY --from=build /app/publish .

# Healthcheck nativo sem dependência de curl externo (Render utiliza healthCheckPath HTTP /health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n" >&3 && head -n 1 <&3 | grep -q "200"' || exit 1

ENTRYPOINT ["dotnet", "DataConform.Api.dll"]
