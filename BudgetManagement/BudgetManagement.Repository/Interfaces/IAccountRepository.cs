using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IAccountRepository : IBaseRepository<Account>
{
    Task<IEnumerable<Account>> GetByUserIdAsync(int userId);
    Task<IEnumerable<Account>> GetByUserAndTypeAsync(int userId, int typeId);
    Task<Account?> GetWithDetailsAsync(int accountId); // include AccountType
    Task<Account?> FindByUserAndNameAsync(int userId, int typeId, string name);
    Task UpdateBalanceAsync(int accountId, decimal delta);
}