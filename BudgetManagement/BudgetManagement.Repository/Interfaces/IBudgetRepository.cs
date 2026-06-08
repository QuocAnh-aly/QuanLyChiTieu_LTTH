using BudgetManagement.Dto;
using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IBudgetRepository : IBaseRepository<Budget>
{
    Task<IEnumerable<Budget>> GetByUserIdAsync(int userId);
    Task<IEnumerable<Budget>> GetExpenseBudgetsAsync(int userId);   // BudgetType = "expense"
    Task<PaginatedResult<Budget>> GetExpenseBudgetsPagedAsync(int userId, int page, int pageSize, string? search = null, string? filterStatus = null, string? sortBy = null);
    Task<IEnumerable<Budget>> GetSavingsGoalsAsync(int userId);     // BudgetType = "savings"
    Task<PaginatedResult<Budget>> GetSavingsGoalsPagedAsync(int userId, int page, int pageSize);
    Task<Budget?> GetActiveByAccountIdAsync(int accountId);
    Task UpdateCurrentAmountAsync(int budgetId, decimal amount);
    Task<IEnumerable<Budget>> GetExpenseBudgetsNeedingResetAsync();

    // Piggy bank events
    Task AddEventAsync(int budgetId, decimal amount, string? notes);
    Task<IEnumerable<PiggyBankEvent>> GetEventsByBudgetIdAsync(int budgetId);
    Task DeleteEventsByBudgetIdAsync(int budgetId);
    Task DeleteByAccountIdAsync(int accountId);
}