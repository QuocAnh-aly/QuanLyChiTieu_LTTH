using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class WebhookRepository : BaseRepository<Webhook>, IWebhookRepository
{
    public WebhookRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Webhook>> GetByUserAsync(int userId)
        => await _dbSet
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Webhook>> GetActiveByUserAndTriggerAsync(int userId, string triggerType)
        => await _dbSet
            .Where(w => w.UserId == userId
                     && w.IsActive == true
                     && w.TriggerType == triggerType)
            .ToListAsync();

    public async Task<IEnumerable<WebhookMessage>> GetMessagesAsync(int webhookId, int take)
        => await _context.WebhookMessages
            .Where(m => m.WebhookId == webhookId)
            .OrderByDescending(m => m.SentAt)
            .Take(take)
            .ToListAsync();

    public async Task<WebhookMessage> LogMessageAsync(WebhookMessage message)
    {
        _context.WebhookMessages.Add(message);
        await _context.SaveChangesAsync();
        return message;
    }
}
