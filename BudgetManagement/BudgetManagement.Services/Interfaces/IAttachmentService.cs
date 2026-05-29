using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public class AttachmentUploadInput
{
    public Stream Content   { get; set; } = null!;
    public string Filename  { get; set; } = null!;
    public string? Mime     { get; set; }
    public long   Size      { get; set; }
}

public interface IAttachmentService
{
    Task<IEnumerable<AttachmentDto>> GetAllAsync(int userId);
    Task<IEnumerable<AttachmentDto>> GetByAttachableAsync(int userId, string type, int id);
    Task<AttachmentDto> GetByIdAsync(int userId, int attachmentId);
    Task<AttachmentDto> CreateAsync(int userId, CreateAttachmentDto metadata, AttachmentUploadInput file);
    Task<AttachmentDto> UpdateAsync(int userId, int attachmentId, UpdateAttachmentDto request);
    Task<bool> DeleteAsync(int userId, int attachmentId);
    Task<(Stream Stream, string Mime, string Filename)> DownloadAsync(int userId, int attachmentId);
}
