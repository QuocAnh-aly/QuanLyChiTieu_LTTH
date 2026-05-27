using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IBudgetRepository : IBaseRepository<Budget>
{
    Task<IEnumerable<Budget>> GetByUserIdAsync(int userId);
    Task<IEnumerable<Budget>> GetExpenseBudgetsAsync(int userId);   // BudgetType = "expense"
    Task<IEnumerable<Budget>> GetSavingsGoalsAsync(int userId);     // BudgetType = "savings"
    Task<Budget?> GetActiveByAccountIdAsync(int accountId);
    Task UpdateCurrentAmountAsync(int budgetId, decimal amount);

    // Piggy bank events
    Task AddEventAsync(int budgetId, decimal amount, string? notes);
    Task<IEnumerable<PiggyBankEvent>> GetEventsByBudgetIdAsync(int budgetId);
    Task DeleteEventsByBudgetIdAsync(int budgetId);
}