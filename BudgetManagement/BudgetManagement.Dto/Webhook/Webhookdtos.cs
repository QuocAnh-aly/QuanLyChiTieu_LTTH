using System.Text.Json.Serialization;

namespace BudgetManagement.Dto;

public class WebhookDto
{
    [JsonPropertyName("webhook_id")]
    public int WebhookId { get; set; }

    public string Title { get; set; } = null!;
    public string Url { get; set; } = null!;

    [JsonPropertyName("trigger_type")]
    public string TriggerType { get; set; } = null!;

    public string Response { get; set; } = null!;

    public string? Secret { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }
}

public class CreateWebhookDto
{
    public string Title { get; set; } = null!;
    public string Url { get; set; } = null!;

    [JsonPropertyName("trigger_type")]
    public string? TriggerType { get; set; }

    public string? Response { get; set; }
    public string? Secret { get; set; }
}

public class UpdateWebhookDto
{
    public string? Title { get; set; }
    public string? Url { get; set; }

    [JsonPropertyName("trigger_type")]
    public string? TriggerType { get; set; }

    public string? Response { get; set; }
    public string? Secret { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
}

public class WebhookMessageDto
{
    [JsonPropertyName("message_id")]
    public int MessageId { get; set; }

    [JsonPropertyName("webhook_id")]
    public int WebhookId { get; set; }

    [JsonPropertyName("journal_id")]
    public int? JournalId { get; set; }

    public string? Payload { get; set; }

    [JsonPropertyName("status_code")]
    public int StatusCode { get; set; }

    public bool Success { get; set; }

    [JsonPropertyName("response_body")]
    public string? ResponseBody { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("sent_at")]
    public DateTime? SentAt { get; set; }
}
