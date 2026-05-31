using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class RecurringRepository : BaseRepository<RecurringJournal>, IRecurringRepository
{
    public RecurringRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<RecurringJournal>> GetByUserIdAsync(int userId)
        => await _dbSet
            .Where(r => r.UserId == userId && r.IsActive == true)
            .Include(r => r.DebitAccount)
            .Include(r => r.CreditAccount)
            .OrderBy(r => r.NextRunDate)
            .ToListAsync();

    public async Task<PaginatedResult<RecurringJournal>> GetByUserIdPagedAsync(int userId, int page, int pageSize)
    {
        var query = _dbSet
            .Where(r => r.UserId == userId && r.IsActive == true)
            .Include(r => r.DebitAccount)
            .Include(r => r.CreditAccount)
            .OrderBy(r => r.NextRunDate);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<RecurringJournal>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IEnumerable<RecurringJournal>> GetDueAsync(DateTime asOf)
        => await _dbSet
            .Where(r => r.IsActive == true && r.NextRunDate <= asOf)
            .Include(r => r.DebitAccount)
            .Include(r => r.CreditAccount)
            .ToListAsync();

    public async Task<IEnumerable<RecurringInstance>> GetInstancesByRecurringIdAsync(int recurringId)
        => await _context.RecurringInstances
            .Where(i => i.RecurringId == recurringId)
            .OrderByDescending(i => i.DueDate)
            .ToListAsync();

    public async Task<RecurringInstance> AddInstanceAsync(RecurringInstance instance)
    {
        _context.RecurringInstances.Add(instance);
        await _context.SaveChangesAsync();
        return instance;
    }

    // Override GetByIdAsync để include Accounts
    public override async Task<RecurringJournal?> GetByIdAsync(int id)
        => await _dbSet
            .Include(r => r.DebitAccount)
            .Include(r => r.CreditAccount)
            .FirstOrDefaultAsync(r => r.RecurringId == id);
}