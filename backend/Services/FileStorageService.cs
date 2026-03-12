namespace backend.Services;

public interface IFileStorageService
{
    Task<string> SaveFileAsync(IFormFile file, int claimId);
    void DeleteFile(string storedPath);
    string GetFullPath(string storedPath);
}

public class FileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public FileStorageService(IWebHostEnvironment env)
    {
        _basePath = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveFileAsync(IFormFile file, int claimId)
    {
        var claimDir = Path.Combine(_basePath, claimId.ToString());
        Directory.CreateDirectory(claimDir);

        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(claimDir, uniqueName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Path.Combine(claimId.ToString(), uniqueName);
    }

    public void DeleteFile(string storedPath)
    {
        var fullPath = GetFullPath(storedPath);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    public string GetFullPath(string storedPath)
    {
        return Path.Combine(_basePath, storedPath);
    }
}
