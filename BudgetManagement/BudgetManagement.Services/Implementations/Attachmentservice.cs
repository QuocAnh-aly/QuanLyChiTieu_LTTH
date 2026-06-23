using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;
using Microsoft.Extensions.Configuration;

namespace BudgetManagement.Services.Implementations;

public class AttachmentService : IAttachmentService
{
    private readonly IAttachmentRepository _repo;
    private readonly string _root;

    private static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "transaction", "bill", "budget", "account", "piggy", "tag"
    };

    public AttachmentService(IAttachmentRepository repo, IConfiguration config)
    {
        _repo = repo;
        _root = config["Attachments:Root"] ?? Path.Combine(AppContext.BaseDirectory, "attachments");
        Directory.CreateDirectory(_root);
    }

    public async Task<IEnumerable<AttachmentDto>> GetAllAsync(int userId)
        => (await _repo.GetByUserAsync(userId)).Select(MapToDto);

    public async Task<IEnumerable<AttachmentDto>> GetByAttachableAsync(int userId, string type, int id)
    {
        if (!ValidTypes.Contains(type))
            throw new ArgumentException("Loại đính kèm không hợp lệ.");
        return (await _repo.GetByAttachableAsync(userId, type.ToLowerInvariant(), id)).Select(MapToDto);
    }

    public async Task<AttachmentDto> GetByIdAsync(int userId, int attachmentId)
    {
        var a = await _repo.GetByIdAsync(attachmentId)
                ?? throw new KeyNotFoundException("Không tìm thấy tệp đính kèm.");
        if (a.UserId != userId) throw new UnauthorizedAccessException();
        return MapToDto(a);
    }

    public async Task<AttachmentDto> CreateAsync(int userId, CreateAttachmentDto metadata, AttachmentUploadInput file)
    {
        if (file is null || file.Size == 0 || file.Content is null)
            throw new ArgumentException("Vui lòng chọn tệp.");
        var type = metadata.AttachableType.ToLowerInvariant();
        if (!ValidTypes.Contains(type))
            throw new ArgumentException("Loại đính kèm không hợp lệ.");
        if (file.Size > 50L * 1024 * 1024)
            throw new ArgumentException("Tệp quá lớn (tối đa 50 MB).");

        var userDir = Path.Combine(_root, userId.ToString());
        Directory.CreateDirectory(userDir);

        var ext      = Path.GetExtension(file.Filename);
        var safeName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(userDir, safeName);
        var relPath  = Path.Combine(userId.ToString(), safeName).Replace('\\', '/');

        using (var fs = File.Create(fullPath))
            await file.Content.CopyToAsync(fs);

        var entity = new Attachment
        {
            UserId         = userId,
            AttachableType = type,
            AttachableId   = metadata.AttachableId,
            Title          = metadata.Title?.Trim(),
            Notes          = metadata.Notes?.Trim(),
            Filename       = Path.GetFileName(file.Filename),
            Mime           = file.Mime,
            Size           = file.Size,
            FilePath       = relPath,
            UploadedAt     = DateTime.UtcNow,
        };
        return MapToDto(await _repo.CreateAsync(entity));
    }

    public async Task<AttachmentDto> UpdateAsync(int userId, int attachmentId, UpdateAttachmentDto request)
    {
        var a = await _repo.GetByIdAsync(attachmentId)
                ?? throw new KeyNotFoundException("Không tìm thấy tệp đính kèm.");
        if (a.UserId != userId) throw new UnauthorizedAccessException();

        if (request.Title != null) a.Title = request.Title.Trim();
        if (request.Notes != null) a.Notes = request.Notes.Trim();
        return MapToDto(await _repo.UpdateAsync(a));
    }

    public async Task<bool> DeleteAsync(int userId, int attachmentId)
    {
        var a = await _repo.GetByIdAsync(attachmentId)
                ?? throw new KeyNotFoundException("Không tìm thấy tệp đính kèm.");
        if (a.UserId != userId) throw new UnauthorizedAccessException();

        var full = Path.Combine(_root, a.FilePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(full)) { try { File.Delete(full); } catch { /* ignore */ } }

        return await _repo.DeleteAsync(attachmentId);
    }

    public async Task<(Stream Stream, string Mime, string Filename)> DownloadAsync(int userId, int attachmentId)
    {
        var a = await _repo.GetByIdAsync(attachmentId)
                ?? throw new KeyNotFoundException("Không tìm thấy tệp đính kèm.");
        if (a.UserId != userId) throw new UnauthorizedAccessException();

        var full = Path.Combine(_root, a.FilePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) throw new FileNotFoundException("Tập tin không còn trên máy chủ.");

        var stream = File.OpenRead(full);
        return (stream, a.Mime ?? "application/octet-stream", a.Filename);
    }

    private static AttachmentDto MapToDto(Attachment a) => new()
    {
        AttachmentId   = a.AttachmentId,
        AttachableType = a.AttachableType,
        AttachableId   = a.AttachableId,
        Title          = a.Title,
        Notes          = a.Notes,
        Filename       = a.Filename,
        Mime           = a.Mime,
        Size           = a.Size,
        UploadedAt     = a.UploadedAt,
    };
}
