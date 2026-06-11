using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class JournalRepository : BaseRepository<JournalEntry>, IJournalRepository
{
    public JournalRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<JournalEntry>> GetByUserIdAsync(int userId, int page, int pageSize)
        => await _context.JournalEntries
            .Where(e => e.UserId == userId)
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .OrderByDescending(e => e.TransactionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

    public async Task<IEnumerable<JournalEntry>> GetByDateRangeAsync(
        int userId, DateTime from, DateTime to)
        => await _context.JournalEntries
            .Where(e => e.UserId == userId
                     && e.TransactionDate >= from
                     && e.TransactionDate <= to)
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .OrderByDescending(e => e.TransactionDate)
            .ToListAsync();

    public async Task<IEnumerable<JournalEntry>> GetByDateRangeAndAccountAsync(
        int userId, DateTime from, DateTime to, int accountId)
        => await _context.JournalEntries
            .Where(e => e.UserId == userId
                     && e.TransactionDate >= from
                     && e.TransactionDate <= to
                     && e.JournalDetails.Any(d => d.AccountId == accountId))
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .OrderByDescending(e => e.TransactionDate)
            .ToListAsync();

    public async Task<JournalEntry?> GetWithDetailsAsync(int journalId)
        => await _context.JournalEntries
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
                    .ThenInclude(a => a!.AccountType)
            .FirstOrDefaultAsync(e => e.JournalId == journalId);

    public async Task<JournalEntry> CreateWithDetailsAsync(
        JournalEntry entry, IEnumerable<JournalDetail> details)
    {
        // Dùng transaction để đảm bảo entry + details được lưu cùng nhau
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            _context.JournalEntries.Add(entry);
            await _context.SaveChangesAsync();

            foreach (var detail in details)
            {
                detail.JournalId = entry.JournalId;
                _context.JournalDetails.Add(detail);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Load lại với Include để trả về đầy đủ
            return await GetWithDetailsAsync(entry.JournalId) ?? entry;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateEntryAsync(int journalId, string? description, string? notes, string? tags, DateTime? transactionDate)
    {
        var entry = await _context.JournalEntries.FindAsync(journalId);
        if (entry is null) return false;

        if (description is not null)  entry.Description     = description;
        if (notes       is not null)  entry.Notes           = notes;
        if (tags        is not null)  entry.Tags            = tags;
        if (transactionDate.HasValue) entry.TransactionDate = transactionDate.Value;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetBudgetIdAsync(int journalId, int? budgetId)
    {
        var entry = await _context.JournalEntries.FindAsync(journalId);
        if (entry is null) return false;

        entry.BudgetId = budgetId;  // always set, including null to clear

        await _context.SaveChangesAsync();
        return true;
    }
    public async Task<bool> HasTransaction (int accountId)
    {
        return await _context.JournalDetails
            .AnyAsync(d => d.AccountId == accountId);
    }

    public async Task<bool> UpdateEntryAmountAsync(int journalId, decimal newAmount)
    {
        var details = await _context.JournalDetails
            .Where(d => d.JournalId == journalId)
            .ToListAsync();

        if (details.Count == 0) return false;

        foreach (var detail in details)
        {
            if (detail.Debit > 0 && detail.Credit == 0)
                detail.Debit = newAmount;
            else if (detail.Credit > 0 && detail.Debit == 0)
                detail.Credit = newAmount;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HasDetailsForAccountAsync(int accountId)
        => await _context.JournalDetails.AnyAsync(d => d.AccountId == accountId);

    public async Task<IEnumerable<JournalEntry>> GetByDateRangeAndBudgetAsync(
        int userId, DateTime from, DateTime to, int budgetId)
        => await _context.JournalEntries
            .Where(e => e.UserId == userId
                     && e.BudgetId == budgetId
                     && e.TransactionDate >= from
                     && e.TransactionDate <= to)
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .OrderByDescending(e => e.TransactionDate)
            .ToListAsync();

    public async Task<IEnumerable<JournalEntry>> GetByDateRangeAndBudgetWithUntrackedAsync(
        int userId, DateTime from, DateTime to, int budgetId, int accountId)
    {
        // 1. Tracked transactions (BudgetId = budgetId)
        var tracked = await _context.JournalEntries
            .Where(e => e.UserId == userId
                     && e.BudgetId == budgetId
                     && e.TransactionDate >= from
                     && e.TransactionDate <= to)
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .ToListAsync();

        // 2. Untracked transactions (BudgetId = null, cùng category)
        var untracked = await _context.JournalEntries
            .Where(e => e.UserId == userId
                     && e.BudgetId == null
                     && e.TransactionDate >= from
                     && e.TransactionDate <= to
                     && e.JournalDetails.Any(d => d.AccountId == accountId
                                               && d.Debit > 0
                                               && d.Account!.TypeId == 5))
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .ToListAsync();

        // Merge: tracked trước, untracked sau, sắp xếp theo ngày giảm dần
        var result = tracked.Concat(untracked)
            .OrderByDescending(e => e.TransactionDate)
            .ToList();

        return result;
    }
}