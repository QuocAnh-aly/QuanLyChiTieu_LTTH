using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class BillRepository : BaseRepository<Bill>, IBillRepository
{
    public BillRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Bill>> GetByUserIdAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.ObjectGroup ?? "zzz")
            .ThenBy(b => b.Name)
            .ToListAsync();

    public async Task<PaginatedResult<Bill>> GetByUserIdPagedAsync(int userId, int page, int pageSize)
    {
        var query = _dbSet
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.ObjectGroup ?? "zzz")
            .ThenBy(b => b.Name);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<Bill>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public override async Task<Bill?> GetByIdAsync(int id)
        => await _dbSet.FirstOrDefaultAsync(b => b.BillId == id);

    public async Task<Bill?> GetByIdWithEntriesAsync(int billId)
        => await _dbSet
            .Include(b => b.JournalEntries)
                .ThenInclude(j => j.JournalDetails)
            .FirstOrDefaultAsync(b => b.BillId == billId);

    public async Task<IEnumerable<JournalEntry>> GetLinkedEntriesAsync(int billId)
        => await _context.JournalEntries
            .Include(j => j.JournalDetails)
            .Where(j => j.BillId == billId)
            .OrderByDescending(j => j.TransactionDate)
            .ToListAsync();

    public async Task<IEnumerable<JournalEntry>> GetLinkedEntriesForUserAsync(int userId)
        => await _context.JournalEntries
            .Where(j => j.UserId == userId && j.BillId != null)
            .ToListAsync();

    public async Task UnlinkAllEntriesAsync(int billId)
        => await _context.JournalEntries
            .Where(j => j.BillId == billId)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.BillId, (int?)null));

    public async Task LinkEntriesByAmountAsync(int billId, int userId, decimal amountMin, decimal amountMax)
    {
        // Find journal entries for this user where sum of debit details falls in [min, max]
        var matchingIds = await _context.JournalDetails
            .Where(d => d.Debit > 0 && d.JournalEntry.UserId == userId)
            .GroupBy(d => d.JournalId)
            .Where(g => g.Sum(d => d.Debit ?? 0) >= amountMin &&
                        g.Sum(d => d.Debit ?? 0) <= amountMax)
            .Select(g => g.Key)
            .ToListAsync();

        if (matchingIds.Count == 0) return;

        await _context.JournalEntries
            .Where(j => matchingIds.Contains(j.JournalId) && j.BillId == null)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.BillId, billId));
    }
}
