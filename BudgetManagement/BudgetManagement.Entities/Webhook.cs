namespace BudgetManagement.Entities;

public class Webhook
{
    public int WebhookId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = null!;
    public string Url { get; set; } = null!;
    public string TriggerType { get; set; } = "STORE_TRANSACTION";
    public string Response { get; set; } = "TRANSACTIONS";
    public string? Secret { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<WebhookMessage> Messages { get; set; } = new List<WebhookMessage>();
}
