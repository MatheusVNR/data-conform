using Microsoft.Extensions.Configuration;
using DataConform.Application.Common.Interfaces;

namespace DataConform.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _storageDirectory;

    public LocalFileStorageService(IConfiguration configuration)
    {
        string? configuredPath = configuration["FileStorage:BasePath"];
        _storageDirectory = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(AppContext.BaseDirectory, "storage", "uploads")
            : configuredPath;

        if (!Directory.Exists(_storageDirectory))
        {
            Directory.CreateDirectory(_storageDirectory);
        }
    }

    public async Task<string> SaveFileAsync(Stream content, string originalFileName, CancellationToken cancellationToken = default)
    {
        string sanitizedFileName = Path.GetFileName(originalFileName);
        string extension = Path.GetExtension(sanitizedFileName);
        string storedFileName = $"{Guid.NewGuid():N}{extension}";
        string fullPath = Path.Combine(_storageDirectory, storedFileName);

        using FileStream destinationStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(destinationStream, cancellationToken);

        return storedFileName;
    }

    public Task<Stream> GetFileStreamAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        string fullPath = Path.Combine(_storageDirectory, Path.GetFileName(storedFileName));
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Arquivo de armazenamento não encontrado: {storedFileName}", fullPath);
        }

        FileStream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream>(stream);
    }

    public Task DeleteFileAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        string fullPath = Path.Combine(_storageDirectory, Path.GetFileName(storedFileName));
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    public Task<int> PurgeExpiredFilesAsync(TimeSpan maxAge, CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(_storageDirectory))
        {
            return Task.FromResult(0);
        }

        DateTime cutoffUtc = DateTime.UtcNow.Subtract(maxAge);
        string[] files = Directory.GetFiles(_storageDirectory);
        int deletedCount = 0;

        foreach (string filePath in files)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                DateTime lastWriteUtc = File.GetLastWriteTimeUtc(filePath);
                if (lastWriteUtc <= cutoffUtc)
                {
                    File.Delete(filePath);
                    deletedCount++;
                }
            }
            catch (IOException)
            {
                // Ignora arquivo temporariamente em uso por leitura concorrente
            }
            catch (UnauthorizedAccessException)
            {
                // Ignora falhas transitórias de permissão de sistema de arquivos
            }
        }

        return Task.FromResult(deletedCount);
    }
}
