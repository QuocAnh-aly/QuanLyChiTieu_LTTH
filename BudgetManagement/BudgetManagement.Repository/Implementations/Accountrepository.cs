using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class AccountRepository : BaseRepository<Account>, IAccountRepository
{
    public AccountRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Account>> GetByUserIdAsync(int userId)
        => await _dbSet
            .Where(a => a.UserId == userId && a.IsActive == true)
            .Include(a => a.AccountType)
            .OrderBy(a => a.TypeId)
            .ThenBy(a => a.Name)
            .ToListAsync();

    public async Task<PaginatedResult<Account>> GetByUserIdPagedAsync(int userId, int page, int pageSize)
    {
        var query = _dbSet
            .Where(a => a.UserId == userId && a.IsActive == true)
            .Include(a => a.AccountType)
            .OrderBy(a => a.TypeId)
            .ThenBy(a => a.Name);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<Account>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IEnumerable<Account>> GetByUserAndTypeAsync(int userId, int typeId)
        => await _dbSet
            .Where(a => a.UserId == userId && a.TypeId == typeId && a.IsActive == true)
            .Include(a => a.AccountType)
            .OrderBy(a => a.Name)
            .ToListAsync();

    public async Task<PaginatedResult<Account>> GetByUserAndTypePagedAsync(int userId, int typeId, int page, int pageSize)
    {
        var query = _dbSet
            .Where(a => a.UserId == userId && a.TypeId == typeId && a.IsActive == true)
            .Include(a => a.AccountType)
            .OrderBy(a => a.Name);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<Account>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Account?> GetWithDetailsAsync(int accountId)
        => await _dbSet
            .Include(a => a.AccountType)
            .FirstOrDefaultAsync(a => a.AccountId == accountId);

    public async Task<Account?> FindByUserAndNameAsync(int userId, int typeId, string name)
        => await _dbSet
            .FirstOrDefaultAsync(a => a.UserId == userId
                                   && a.TypeId  == typeId
                                   && a.Name    == name
                                   && a.IsActive == true);

    public async Task UpdateBalanceAsync(int accountId, decimal delta)
    {
        // Dùng ExecuteUpdate để tránh race condition — không cần load entity
        await _dbSet
            .Where(a => a.AccountId == accountId)
            .ExecuteUpdateAsync(s =>
                s.SetProperty(a => a.Balance, a => (a.Balance ?? 0) + delta)
            );
    }
}