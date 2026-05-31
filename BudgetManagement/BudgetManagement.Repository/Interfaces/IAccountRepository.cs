using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

using BudgetManagement.Dto;

public interface IAccountRepository : IBaseRepository<Account>
{
    Task<IEnumerable<Account>> GetByUserIdAsync(int userId);
    Task<PaginatedResult<Account>> GetByUserIdPagedAsync(int userId, int page, int pageSize);
    Task<IEnumerable<Account>> GetByUserAndTypeAsync(int userId, int typeId);
    Task<PaginatedResult<Account>> GetByUserAndTypePagedAsync(int userId, int typeId, int page, int pageSize);
    Task<Account?> GetWithDetailsAsync(int accountId); // include AccountType
    Task<Account?> FindByUserAndNameAsync(int userId, int typeId, string name);
    Task UpdateBalanceAsync(int accountId, decimal delta);
}