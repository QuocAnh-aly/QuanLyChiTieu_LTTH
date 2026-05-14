using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class BudgetRepository : BaseRepository<Budget>, IBudgetRepository
{
    public BudgetRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Budget>> GetByUserIdAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId && b.IsActive == true)
            .Include(b => b.Account)
            .OrderBy(b => b.BudgetType)
            .ThenBy(b => b.Title)
            .ToListAsync();

    public async Task<IEnumerable<Budget>> GetExpenseBudgetsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId
                     && b.BudgetType == "expense"
                     && b.IsActive == true)
            .Include(b => b.Account)
            .OrderBy(b => b.Title)
            .ToListAsync();

    public async Task<IEnumerable<Budget>> GetSavingsGoalsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId
                     && b.BudgetType == "savings"
                     && b.IsActive == true)
            .Include(b => b.Account)
            .OrderBy(b => b.Title)
            .ToListAsync();

    public async Task<Budget?> GetActiveByAccountIdAsync(int accountId)
        => await _dbSet
            .Where(b => b.AccountId == accountId
                     && b.BudgetType == "expense"
                     && b.IsActive == true)
            .FirstOrDefaultAsync();

    public async Task UpdateCurrentAmountAsync(int budgetId, decimal amount)
        => await _dbSet
            .Where(b => b.BudgetId == budgetId)
            .ExecuteUpdateAsync(s =>
                s.SetProperty(b => b.CurrentAmount, amount)
            );

    // Override GetByIdAsync để include Account
    public override async Task<Budget?> GetByIdAsync(int id)
        => await _dbSet
            .Include(b => b.Account)
            .FirstOrDefaultAsync(b => b.BudgetId == id);
}