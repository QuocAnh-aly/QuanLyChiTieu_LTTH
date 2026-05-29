namespace BudgetManagement.Entities;

public class WebhookMessage
{
    public int MessageId { get; set; }
    public int WebhookId { get; set; }
    public int? JournalId { get; set; }
    public string? Payload { get; set; }
    public int StatusCode { get; set; }
    public bool Success { get; set; }
    public string? ResponseBody { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? SentAt { get; set; }

    public Webhook Webhook { get; set; } = null!;
}
