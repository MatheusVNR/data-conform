namespace DataConform.Application.Common.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveFileAsync(Stream content, string originalFileName, CancellationToken cancellationToken = default);
    Task<Stream> GetFileStreamAsync(string storedFileName, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string storedFileName, CancellationToken cancellationToken = default);
}
