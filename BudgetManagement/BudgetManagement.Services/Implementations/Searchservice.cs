using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository;
using BudgetManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Services.Implementations;

public class SearchService : ISearchService
{
    private readonly BudgetManagementDbContext _db;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public SearchService(BudgetManagementDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<SearchTransactionDto>> SearchTransactionsAsync(
        int userId, string? q, DateTime? from, DateTime? to, int limit)
    {
        var query = BuildTransactionQuery(userId, q, from, to);
        var rows = await query
            .OrderByDescending(e => e.TransactionDate)
            .Take(limit <= 0 ? 100 : limit)
            .ToListAsync();

        return rows.Select(MapTx);
    }

    public async Task<int> CountTransactionsAsync(int userId, string? q, DateTime? from, DateTime? to)
        => await BuildTransactionQuery(userId, q, from, to).CountAsync();

    public async Task<IEnumerable<SearchAccountDto>> SearchAccountsAsync(int userId, string? q, int? typeId)
    {
        var query = _db.Accounts
            .Include(a => a.AccountType)
            .Where(a => a.UserId == userId);

        if (typeId.HasValue) query = query.Where(a => a.TypeId == typeId.Value);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = "%" + q.Trim() + "%";
            query = query.Where(a => EF.Functions.Like(a.Name, pattern));
        }

        var list = await query.OrderBy(a => a.Name).ToListAsync();
        return list.Select(a => new SearchAccountDto
        {
            AccountId    = a.AccountId,
            Name         = a.Name,
            TypeId       = a.TypeId,
            TypeName     = a.AccountType?.TypeName,
            Balance      = a.Balance,
            CurrencyCode = a.CurrencyCode,
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private IQueryable<JournalEntry> BuildTransactionQuery(int userId, string? q, DateTime? from, DateTime? to)
    {
        var query = _db.JournalEntries
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
                    .ThenInclude(a => a!.AccountType)
            .Where(e => e.UserId == userId)
            .AsQueryable();

        if (from.HasValue) query = query.Where(e => e.TransactionDate >= from.Value);
        if (to.HasValue)   query = query.Where(e => e.TransactionDate <= to.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = "%" + q.Trim() + "%";
            query = query.Where(e =>
                EF.Functions.Like(e.Description ?? "", pattern) ||
                EF.Functions.Like(e.Notes       ?? "", pattern) ||
                EF.Functions.Like(e.Tags        ?? "", pattern));
        }
        return query;
    }

    private static SearchTransactionDto MapTx(JournalEntry e)
    {
        var debit  = e.JournalDetails.FirstOrDefault(d => (d.Debit  ?? 0) > 0);
        var credit = e.JournalDetails.FirstOrDefault(d => (d.Credit ?? 0) > 0);
        return new SearchTransactionDto
        {
            JournalId          = e.JournalId,
            TransactionDate    = e.TransactionDate,
            Description        = e.Description,
            Notes              = e.Notes,
            Tags               = e.Tags,
            Amount             = debit?.Debit ?? 0m,
            SourceAccount      = credit?.Account?.Name,
            DestinationAccount = debit?.Account?.Name,
        };
    }
}
