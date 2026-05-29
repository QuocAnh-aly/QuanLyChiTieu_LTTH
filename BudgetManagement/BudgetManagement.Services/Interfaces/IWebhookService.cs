using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IWebhookService
{
    Task<IEnumerable<WebhookDto>> GetAllAsync(int userId);
    Task<WebhookDto> GetByIdAsync(int userId, int webhookId);
    Task<WebhookDto> CreateAsync(int userId, CreateWebhookDto request);
    Task<WebhookDto> UpdateAsync(int userId, int webhookId, UpdateWebhookDto request);
    Task<bool> DeleteAsync(int userId, int webhookId);

    Task<IEnumerable<WebhookMessageDto>> GetMessagesAsync(int userId, int webhookId, int take);
    Task<WebhookMessageDto> SubmitAsync(int userId, int webhookId, object? customPayload);

    /// <summary>Fire-and-forget dispatch when a journal event happens.</summary>
    Task DispatchAsync(int userId, string triggerType, int? journalId, object payload);
}
