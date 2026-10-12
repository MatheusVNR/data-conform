using System.Text;
using Microsoft.Extensions.Configuration;
using DataConform.Infrastructure.Services;
using Xunit;

namespace DataConform.UnitTests.Services;

public class LocalFileStorageServiceTests : IDisposable
{
    private readonly string _testDirectory;
    private readonly LocalFileStorageService _storageService;

    public LocalFileStorageServiceTests()
    {
        _testDirectory = Path.Combine(Path.GetTempPath(), "dataconform_test_storage_" + Guid.NewGuid().ToString("N"));
        Dictionary<string, string?> inMemorySettings = new Dictionary<string, string?>
        {
            { "FileStorage:BasePath", _testDirectory }
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _storageService = new LocalFileStorageService(configuration);
    }

    [Fact]
    public async Task SaveFileAsync_And_GetFileStreamAsync_ShouldPersistAndRetrieveFile()
    {
        string fileContent = "Id,Nome\n1,Produto Teste";
        byte[] bytes = Encoding.UTF8.GetBytes(fileContent);
        using MemoryStream stream = new MemoryStream(bytes);

        string storedFileName = await _storageService.SaveFileAsync(stream, "teste.csv");

        Assert.False(string.IsNullOrWhiteSpace(storedFileName));
        Assert.EndsWith(".csv", storedFileName);

        using (Stream retrievedStream = await _storageService.GetFileStreamAsync(storedFileName))
        using (StreamReader reader = new StreamReader(retrievedStream))
        {
            string retrievedContent = await reader.ReadToEndAsync();
            Assert.Equal(fileContent, retrievedContent);
        }

        await _storageService.DeleteFileAsync(storedFileName);
        await Assert.ThrowsAsync<FileNotFoundException>(() => _storageService.GetFileStreamAsync(storedFileName));
    }

    public void Dispose()
    {
        if (Directory.Exists(_testDirectory))
        {
            Directory.Delete(_testDirectory, recursive: true);
        }
    }
}
