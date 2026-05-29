using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface ISearchService
{
    Task<IEnumerable<SearchTransactionDto>> SearchTransactionsAsync(
        int userId, string? q, DateTime? from, DateTime? to, int limit);

    Task<int> CountTransactionsAsync(
        int userId, string? q, DateTime? from, DateTime? to);

    Task<IEnumerable<SearchAccountDto>> SearchAccountsAsync(int userId, string? q, int? typeId);
}
