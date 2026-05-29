using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface ICurrencyRepository : IBaseRepository<Currency>
{
    Task<IEnumerable<Currency>> GetByUserAsync(int userId);
    Task<Currency?> GetByUserAndCodeAsync(int userId, string code);
    Task<Currency?> GetPrimaryAsync(int userId);
    Task ClearPrimaryAsync(int userId);
}
