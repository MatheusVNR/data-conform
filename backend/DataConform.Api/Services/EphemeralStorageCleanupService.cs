using Microsoft.EntityFrameworkCore;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;
using DataConform.Infrastructure.Persistence;

namespace DataConform.Api.Services;

/// <summary>
/// Serviço em segundo plano responsável pelo expurgo automático de planilhas CSV brutas
/// após a janela de retenção efêmera (padrão: 24 horas), preservando apenas metadados e laudos
/// no banco PostgreSQL em conformidade com o princípio de minimização de dados da LGPD.
/// </summary>
public class EphemeralStorageCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EphemeralStorageCleanupService> _logger;

    public EphemeralStorageCleanupService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<EphemeralStorageCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        int retentionHours = _configuration.GetValue<int>("FileStorage:RetentionHours", 24);
        if (retentionHours <= 0)
        {
            retentionHours = 24;
        }

        TimeSpan maxFileAge = TimeSpan.FromHours(retentionHours);
        TimeSpan checkInterval = TimeSpan.FromHours(1);

        await RunCleanupPassAsync(maxFileAge, stoppingToken);

        using PeriodicTimer timer = new PeriodicTimer(checkInterval);
        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunCleanupPassAsync(maxFileAge, stoppingToken);
        }
    }

    private async Task RunCleanupPassAsync(TimeSpan maxFileAge, CancellationToken stoppingToken)
    {
        try
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            IFileStorageService fileStorage = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
            int purgedCount = await fileStorage.PurgeExpiredFilesAsync(maxFileAge, stoppingToken);

            if (purgedCount > 0)
            {
                _logger.LogInformation(
                    "Expurgo efêmero LGPD concluído: {PurgedCount} arquivo(s) CSV temporário(s) com mais de {Hours}h removido(s) do armazenamento físico.",
                    purgedCount,
                    maxFileAge.TotalHours);
            }

            DataConformDbContext? dbContext = scope.ServiceProvider.GetService<DataConformDbContext>();
            if (dbContext != null)
            {
                DateTimeOffset staleCutoff = DateTimeOffset.UtcNow.AddMinutes(-30);
                List<ImportFile> staleProcessingFiles = await dbContext.ImportFiles
                    .IgnoreQueryFilters()
                    .Where(f => f.Status == FileStatus.Processing &&
                                (f.ProcessedAt ?? f.CreatedAt) < staleCutoff)
                    .ToListAsync(stoppingToken);

                if (staleProcessingFiles.Count > 0)
                {
                    foreach (ImportFile staleFile in staleProcessingFiles)
                    {
                        staleFile.Status = FileStatus.Failed;
                    }

                    await dbContext.SaveChangesAsync(stoppingToken);
                    _logger.LogWarning(
                        "Recuperação automática: {Count} arquivo(s) travado(s) em Processing há mais de 30 minutos foram marcados como Failed.",
                        staleProcessingFiles.Count);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Encerramento normal da aplicação
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha não crítica durante ciclo de limpeza de arquivos CSV temporários.");
        }
    }
}
