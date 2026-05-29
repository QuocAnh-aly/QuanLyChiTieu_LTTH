using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IWebhookRepository : IBaseRepository<Webhook>
{
    Task<IEnumerable<Webhook>> GetByUserAsync(int userId);
    Task<IEnumerable<Webhook>> GetActiveByUserAndTriggerAsync(int userId, string triggerType);
    Task<IEnumerable<WebhookMessage>> GetMessagesAsync(int webhookId, int take);
    Task<WebhookMessage> LogMessageAsync(WebhookMessage message);
}
