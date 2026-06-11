using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IBudgetService
{
    // Expense budgets (Budget.jsx)
    Task<IEnumerable<BudgetDto>> GetExpenseBudgetsAsync(int userId);
    Task<PaginatedResult<BudgetDto>> GetExpenseBudgetsPagedAsync(int userId, int page, int pageSize, string? search = null, string? filterStatus = null, string? sortBy = null);
    Task<BudgetDto> GetExpenseBudgetByIdAsync(int userId, int budgetId);
    Task<BudgetDto> CreateExpenseBudgetAsync(int userId, CreateBudgetDto request);
    Task<BudgetDto> UpdateExpenseBudgetAsync(int userId, int budgetId, UpdateBudgetDto request);
    Task<bool> DeleteBudgetAsync(int userId, int budgetId);

    // Savings goals (Savings.jsx)
    Task<IEnumerable<SavingsGoalDto>> GetSavingsGoalsAsync(int userId);
    Task<SavingsGoalDto> GetSavingsGoalByIdAsync(int userId, int budgetId);
    Task<SavingsGoalDto> CreateSavingsGoalAsync(int userId, CreateSavingsGoalDto request);
    Task<SavingsGoalDto> UpdateSavingsGoalAsync(int userId, int budgetId, UpdateSavingsGoalDto request);

    // Piggy bank actions
    Task<SavingsGoalDto> AddMoneyAsync(int userId, int budgetId, decimal amount, string? notes, int sourceAccountId);
    Task<SavingsGoalDto> RemoveMoneyAsync(int userId, int budgetId, decimal amount, string? notes, int destinationAccountId);
    Task<bool> ResetHistoryAsync(int userId, int budgetId);
    Task<IEnumerable<PiggyBankEventDto>> GetEventsAsync(int userId, int budgetId);

    // Cập nhật số tiền đã chi — cập nhật trực tiếp vào budget cụ thể theo budgetId
    Task UpdateBudgetSpentAsync(int budgetId, decimal delta);

    // Budget period reset — called by RecurringHostedService at midnight
    Task ResetExpiredPeriodsAsync();
}