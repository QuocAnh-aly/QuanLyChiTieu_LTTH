using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IBudgetRepository : IBaseRepository<Budget>
{
    Task<IEnumerable<Budget>> GetByUserIdAsync(int userId);
    Task<IEnumerable<Budget>> GetExpenseBudgetsAsync(int userId);   // BudgetType = "expense"
    Task<IEnumerable<Budget>> GetSavingsGoalsAsync(int userId);     // BudgetType = "savings"
    Task<Budget?> GetActiveByAccountIdAsync(int accountId);         // tìm budget theo accountId để cập nhật chi tiêu
    Task UpdateCurrentAmountAsync(int budgetId, decimal amount);
}