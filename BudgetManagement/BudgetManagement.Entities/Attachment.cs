namespace BudgetManagement.Entities;

public class Attachment
{
    public int AttachmentId { get; set; }
    public int UserId { get; set; }
    public string AttachableType { get; set; } = null!;
    public int AttachableId { get; set; }
    public string? Title { get; set; }
    public string? Notes { get; set; }
    public string Filename { get; set; } = null!;
    public string? Mime { get; set; }
    public long Size { get; set; }
    public string FilePath { get; set; } = null!;
    public DateTime? UploadedAt { get; set; }

    public User User { get; set; } = null!;
}
