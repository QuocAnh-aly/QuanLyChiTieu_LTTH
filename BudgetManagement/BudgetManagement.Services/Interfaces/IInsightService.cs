using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IInsightService
{
    Task<InsightTotalDto> ExpenseTotalAsync(int userId, DateTime from, DateTime to);
    Task<InsightTotalDto> IncomeTotalAsync(int userId, DateTime from, DateTime to);

    Task<IEnumerable<InsightAggregateDto>> ExpenseByCategoryAsync(int userId, DateTime from, DateTime to);
    Task<IEnumerable<InsightAggregateDto>> IncomeByCategoryAsync(int userId, DateTime from, DateTime to);

    Task<IEnumerable<InsightAggregateDto>> ExpenseByTagAsync(int userId, DateTime from, DateTime to);
    Task<IEnumerable<InsightAggregateDto>> IncomeByTagAsync(int userId, DateTime from, DateTime to);

    Task<IEnumerable<InsightMonthlyDto>> MonthlyTrendAsync(int userId, DateTime from, DateTime to);
}
