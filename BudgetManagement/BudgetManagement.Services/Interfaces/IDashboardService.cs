using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int userId);
    Task<IEnumerable<TransactionDto>> GetRecentTransactionsAsync(int userId, int count = 5);
    Task<IEnumerable<CategorySpendingDto>> GetSpendingByCategoryAsync(int userId, DateTime from, DateTime to);
    Task<MonthlyTrendDto> GetMonthlyTrendAsync(int userId, int months = 6);
}