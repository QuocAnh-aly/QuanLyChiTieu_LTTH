using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<User?> GetByAccountAsync(string userAccount)
        => await _dbSet
            .FirstOrDefaultAsync(u => u.UserAccount == userAccount);

    public async Task<User?> GetByEmailAsync(string email)
        => await _dbSet
            .FirstOrDefaultAsync(u => u.Email == email);

    public async Task<bool> ExistsAsync(string userAccount)
        => await _dbSet
            .AnyAsync(u => u.UserAccount == userAccount);
}