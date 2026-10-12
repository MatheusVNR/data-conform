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

# Run automated tests during build
RUN dotnet test tests/DataConform.UnitTests/DataConform.UnitTests.csproj --configuration Release --no-restore

# Publish the API in Release mode
RUN dotnet publish DataConform.Api/DataConform.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build /app/publish .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "DataConform.Api.dll"]
