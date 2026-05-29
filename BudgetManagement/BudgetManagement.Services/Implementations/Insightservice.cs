using BudgetManagement.Dto;
using BudgetManagement.Repository;
using BudgetManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Services.Implementations;

public class InsightService : IInsightService
{
    private readonly BudgetManagementDbContext _db;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public InsightService(BudgetManagementDbContext db) { _db = db; }

    public async Task<InsightTotalDto> ExpenseTotalAsync(int userId, DateTime from, DateTime to)
        => await TotalAsync(userId, from, to, TypeExpense);

    public async Task<InsightTotalDto> IncomeTotalAsync(int userId, DateTime from, DateTime to)
        => await TotalAsync(userId, from, to, TypeRevenue);

    public Task<IEnumerable<InsightAggregateDto>> ExpenseByCategoryAsync(int userId, DateTime from, DateTime to)
        => ByCategoryAsync(userId, from, to, TypeExpense, asDebit: true);

    public Task<IEnumerable<InsightAggregateDto>> IncomeByCategoryAsync(int userId, DateTime from, DateTime to)
        => ByCategoryAsync(userId, from, to, TypeRevenue, asDebit: false);

    public Task<IEnumerable<InsightAggregateDto>> ExpenseByTagAsync(int userId, DateTime from, DateTime to)
        => ByTagAsync(userId, from, to, TypeExpense, asDebit: true);

    public Task<IEnumerable<InsightAggregateDto>> IncomeByTagAsync(int userId, DateTime from, DateTime to)
        => ByTagAsync(userId, from, to, TypeRevenue, asDebit: false);

    public async Task<IEnumerable<InsightMonthlyDto>> MonthlyTrendAsync(int userId, DateTime from, DateTime to)
    {
        var rows = await _db.JournalDetails
            .Include(d => d.Account)
            .Include(d => d.JournalEntry)
            .Where(d => d.JournalEntry.UserId == userId
                     && d.JournalEntry.TransactionDate >= from
                     && d.JournalEntry.TransactionDate <= to
                     && (d.Account!.TypeId == TypeRevenue || d.Account!.TypeId == TypeExpense))
            .Select(d => new
            {
                d.JournalEntry.TransactionDate,
                TypeId = d.Account!.TypeId,
                Debit  = d.Debit  ?? 0m,
                Credit = d.Credit ?? 0m,
            })
            .ToListAsync();

        var months = new Dictionary<string, (decimal income, decimal expense)>();
        // Pre-seed every month in range so the chart shows zero-bars instead of gaps.
        var cursor = new DateTime(from.Year, from.Month, 1);
        var last   = new DateTime(to.Year,   to.Month,   1);
        while (cursor <= last)
        {
            months[cursor.ToString("yyyy-MM")] = (0m, 0m);
            cursor = cursor.AddMonths(1);
        }

        foreach (var r in rows)
        {
            var key = r.TransactionDate.ToString("yyyy-MM");
            if (!months.TryGetValue(key, out var current))
                current = (0m, 0m);

            if (r.TypeId == TypeRevenue && r.Credit > 0)
                current.income += r.Credit;
            else if (r.TypeId == TypeExpense && r.Debit > 0)
                current.expense += r.Debit;

            months[key] = current;
        }

        return months
            .OrderBy(kv => kv.Key)
            .Select(kv => new InsightMonthlyDto
            {
                Month   = kv.Key,
                Income  = kv.Value.income,
                Expense = kv.Value.expense,
            })
            .ToList();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private async Task<InsightTotalDto> TotalAsync(int userId, DateTime from, DateTime to, int categoryTypeId)
    {
        // Withdrawal/Expense: debit on expense account
        // Deposit/Income:     credit on revenue account
        var query = _db.JournalDetails
            .Include(d => d.Account)
            .Include(d => d.JournalEntry)
            .Where(d => d.JournalEntry.UserId == userId
                     && d.JournalEntry.TransactionDate >= from
                     && d.JournalEntry.TransactionDate <= to
                     && d.Account!.TypeId == categoryTypeId);

        if (categoryTypeId == TypeExpense)
        {
            var sum   = await query.Where(d => (d.Debit ?? 0) > 0).SumAsync(d => (decimal?)(d.Debit ?? 0))   ?? 0m;
            var count = await query.Where(d => (d.Debit ?? 0) > 0).Select(d => d.JournalId).Distinct().CountAsync();
            return new InsightTotalDto { Total = sum, Count = count, From = from, To = to };
        }
        else
        {
            var sum   = await query.Where(d => (d.Credit ?? 0) > 0).SumAsync(d => (decimal?)(d.Credit ?? 0)) ?? 0m;
            var count = await query.Where(d => (d.Credit ?? 0) > 0).Select(d => d.JournalId).Distinct().CountAsync();
            return new InsightTotalDto { Total = sum, Count = count, From = from, To = to };
        }
    }

    private async Task<IEnumerable<InsightAggregateDto>> ByCategoryAsync(
        int userId, DateTime from, DateTime to, int categoryTypeId, bool asDebit)
    {
        var rows = await _db.JournalDetails
            .Include(d => d.Account)
            .Include(d => d.JournalEntry)
            .Where(d => d.JournalEntry.UserId == userId
                     && d.JournalEntry.TransactionDate >= from
                     && d.JournalEntry.TransactionDate <= to
                     && d.Account!.TypeId == categoryTypeId
                     && (asDebit ? (d.Debit ?? 0) > 0 : (d.Credit ?? 0) > 0))
            .GroupBy(d => new { d.AccountId, d.Account!.Name })
            .Select(g => new InsightAggregateDto
            {
                Key    = g.Key.AccountId.ToString(),
                Label  = g.Key.Name,
                Amount = asDebit
                    ? g.Sum(d => d.Debit  ?? 0m)
                    : g.Sum(d => d.Credit ?? 0m),
                Count  = g.Select(d => d.JournalId).Distinct().Count(),
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        return rows;
    }

    private async Task<IEnumerable<InsightAggregateDto>> ByTagAsync(
        int userId, DateTime from, DateTime to, int categoryTypeId, bool asDebit)
    {
        // Pull the relevant journals + their amount + tag list, then aggregate in-memory.
        var details = await _db.JournalDetails
            .Include(d => d.Account)
            .Include(d => d.JournalEntry)
            .Where(d => d.JournalEntry.UserId == userId
                     && d.JournalEntry.TransactionDate >= from
                     && d.JournalEntry.TransactionDate <= to
                     && d.Account!.TypeId == categoryTypeId
                     && (asDebit ? (d.Debit ?? 0) > 0 : (d.Credit ?? 0) > 0))
            .Select(d => new
            {
                d.JournalId,
                Tags = d.JournalEntry.Tags ?? "",
                Amount = asDebit ? (d.Debit ?? 0m) : (d.Credit ?? 0m),
            })
            .ToListAsync();

        var grouped = new Dictionary<string, (decimal amount, HashSet<int> journals)>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in details)
        {
            var tags = row.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (tags.Length == 0) tags = new[] { "(no-tag)" };

            foreach (var tag in tags)
            {
                if (!grouped.TryGetValue(tag, out var current))
                    current = (0m, new HashSet<int>());
                current.amount += row.Amount;
                current.journals.Add(row.JournalId);
                grouped[tag] = current;
            }
        }

        return grouped
            .Select(kv => new InsightAggregateDto
            {
                Key    = kv.Key,
                Label  = kv.Key,
                Amount = kv.Value.amount,
                Count  = kv.Value.journals.Count,
            })
            .OrderByDescending(x => x.Amount)
            .ToList();
    }
}
