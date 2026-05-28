using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByAccountAsync(string userAccount);
    Task<User?> GetByEmailAsync(string email);
    Task<bool> ExistsAsync(string userAccount);
}