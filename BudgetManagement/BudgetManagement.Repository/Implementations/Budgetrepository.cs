using BudgetManagement.Dto;
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

    public async Task<PaginatedResult<Budget>> GetExpenseBudgetsPagedAsync(int userId, int page, int pageSize, string? search = null, string? filterStatus = null, string? sortBy = null)
    {
        IQueryable<Budget> query = _dbSet
            .Where(b => b.UserId == userId
                     && b.BudgetType == "expense"
                     && b.IsActive == true)
            .Include(b => b.Account);

        // Search by title
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.Title.Contains(search));

        // Filter by status (percentage-based)
        if (filterStatus == "over")
            query = query.Where(b => b.CurrentAmount > b.TargetAmount);
        else if (filterStatus == "warning")
            query = query.Where(b => b.CurrentAmount >= b.TargetAmount * (decimal)0.8
                                  && b.CurrentAmount <= b.TargetAmount);
        else if (filterStatus == "on-track")
            query = query.Where(b => b.CurrentAmount < b.TargetAmount * (decimal)0.8);

        // Sort
        if (sortBy == "pct-desc")
            query = query.OrderByDescending(b => b.CurrentAmount / (b.TargetAmount > 0 ? b.TargetAmount : 1));
        else if (sortBy == "pct-asc")
            query = query.OrderBy(b => b.CurrentAmount / (b.TargetAmount > 0 ? b.TargetAmount : 1));
        else if (sortBy == "amount")
            query = query.OrderByDescending(b => b.TargetAmount);
        else if (sortBy == "name")
            query = query.OrderBy(b => b.Title);
        else
            query = query.OrderBy(b => b.Title);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<Budget>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IEnumerable<Budget>> GetSavingsGoalsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId
                     && b.BudgetType == "savings"
                     && b.IsActive == true)
            .Include(b => b.Account)
            .OrderBy(b => b.Title)
            .ToListAsync();

    public async Task<PaginatedResult<Budget>> GetSavingsGoalsPagedAsync(int userId, int page, int pageSize)
    {
        var query = _dbSet
            .Where(b => b.UserId == userId
                     && b.BudgetType == "savings"
                     && b.IsActive == true)
            .Include(b => b.Account)
            .OrderBy(b => b.Title);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<Budget>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

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

    public async Task<IEnumerable<Budget>> GetExpenseBudgetsNeedingResetAsync()
        => await _dbSet
            .Where(b => b.BudgetType == "expense"
                     && b.IsActive == true
                     && b.CurrentAmount > 0)
            .ToListAsync();

    // Override GetByIdAsync để include Account + Events
    public override async Task<Budget?> GetByIdAsync(int id)
        => await _dbSet
            .Include(b => b.Account)
            .Include(b => b.PiggyBankEvents.OrderBy(e => e.EventDate))
            .FirstOrDefaultAsync(b => b.BudgetId == id);

    public async Task AddEventAsync(int budgetId, decimal amount, string? notes)
    {
        _context.PiggyBankEvents.Add(new PiggyBankEvent
        {
            BudgetId  = budgetId,
            Amount    = amount,
            EventDate = DateTime.UtcNow,
            Notes     = notes,
        });
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<PiggyBankEvent>> GetEventsByBudgetIdAsync(int budgetId)
        => await _context.PiggyBankEvents
            .Where(e => e.BudgetId == budgetId)
            .OrderByDescending(e => e.EventDate)
            .ToListAsync();

    public async Task DeleteByAccountIdAsync(int accountId)
    {
        await _dbSet
            .Where(b => b.AccountId == accountId)
            .ExecuteDeleteAsync();
    }

    public async Task DeleteEventsByBudgetIdAsync(int budgetId)
    {
        await _context.PiggyBankEvents
            .Where(e => e.BudgetId == budgetId)
            .ExecuteDeleteAsync();
    }
}