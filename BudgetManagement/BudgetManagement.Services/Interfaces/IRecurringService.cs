using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IRecurringService
{
    Task<IEnumerable<RecurringDto>> GetByUserAsync(int userId);
    Task<RecurringDto> GetByIdAsync(int userId, int recurringId);
    Task<RecurringDto> CreateAsync(int userId, CreateRecurringDto request);
    Task<RecurringDto> UpdateAsync(int userId, int recurringId, UpdateRecurringDto request);
    Task<bool> DeleteAsync(int userId, int recurringId);

    // Background job gọi mỗi ngày
    Task ProcessDueRecurringsAsync();
}