using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IExchangeRateRepository : IBaseRepository<ExchangeRate>
{
    Task<IEnumerable<ExchangeRate>> GetByUserAsync(int userId);
    Task<IEnumerable<ExchangeRate>> GetByPairAsync(int userId, string from, string to);
    Task<ExchangeRate?> GetLatestAsync(int userId, string from, string to, DateTime onOrBefore);
    Task<ExchangeRate?> GetExactAsync(int userId, string from, string to, DateTime date);
    Task DeleteByCurrencyAsync(int userId, string code);
}
