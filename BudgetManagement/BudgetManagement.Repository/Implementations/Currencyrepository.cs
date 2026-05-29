using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class CurrencyRepository : BaseRepository<Currency>, ICurrencyRepository
{
    public CurrencyRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Currency>> GetByUserAsync(int userId)
        => await _dbSet
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.IsPrimary)
            .ThenBy(c => c.Code)
            .ToListAsync();

    public async Task<Currency?> GetByUserAndCodeAsync(int userId, string code)
        => await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId && c.Code == code);

    public async Task<Currency?> GetPrimaryAsync(int userId)
        => await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId && c.IsPrimary == true);

    public async Task ClearPrimaryAsync(int userId)
        => await _dbSet
            .Where(c => c.UserId == userId && c.IsPrimary == true)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsPrimary, false));
}
