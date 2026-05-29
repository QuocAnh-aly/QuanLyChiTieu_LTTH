using System.Text.Json.Serialization;

namespace BudgetManagement.Dto;

public class AttachmentDto
{
    [JsonPropertyName("attachment_id")]
    public int AttachmentId { get; set; }

    [JsonPropertyName("attachable_type")]
    public string AttachableType { get; set; } = null!;

    [JsonPropertyName("attachable_id")]
    public int AttachableId { get; set; }

    public string? Title { get; set; }
    public string? Notes { get; set; }
    public string Filename { get; set; } = null!;
    public string? Mime { get; set; }
    public long Size { get; set; }

    [JsonPropertyName("uploaded_at")]
    public DateTime? UploadedAt { get; set; }
}

public class CreateAttachmentDto
{
    [JsonPropertyName("attachable_type")]
    public string AttachableType { get; set; } = null!;

    [JsonPropertyName("attachable_id")]
    public int AttachableId { get; set; }

    public string? Title { get; set; }
    public string? Notes { get; set; }
}

public class UpdateAttachmentDto
{
    public string? Title { get; set; }
    public string? Notes { get; set; }
}
