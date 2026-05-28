using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class DashboardService : IDashboardService
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalRepository _journalRepo;
    private readonly IAccountService    _accountService;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public DashboardService(
        IAccountRepository accountRepo,
        IJournalRepository journalRepo,
        IAccountService accountService)
    {
        _accountRepo    = accountRepo;
        _journalRepo    = journalRepo;
        _accountService = accountService;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(int userId)
    {
        var now        = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd   = monthStart.AddMonths(1).AddSeconds(-1);

        var wallet      = await _accountService.GetWalletSummaryAsync(userId);
        var cashFlow    = await GetCashFlowInternalAsync(userId, monthStart, monthEnd);
        var categories  = await GetSpendingByCategoryAsync(userId, monthStart, monthEnd);
        var recent      = await GetRecentTransactionsAsync(userId, 5);
        var trend       = await GetMonthlyTrendAsync(userId, 6);

        return new DashboardSummaryDto
        {
            TotalBalance      = wallet.NetWorth,
            TotalAssets       = wallet.TotalAssets,
            TotalLiabilities  = wallet.TotalLiabilities,
            TotalSavings      = wallet.TotalSavings,
            MonthlyIncome     = cashFlow.TotalIncome,
            MonthlyExpense    = cashFlow.TotalExpense,
            NetCashFlow       = cashFlow.NetCashFlow,
            RecentTransactions = recent.ToList(),
            SpendingByCategory = categories.ToList(),
            MonthlyTrend       = trend
        };
    }

    public async Task<IEnumerable<TransactionDto>> GetRecentTransactionsAsync(int userId, int count = 5)
    {
        var entries = await _journalRepo.GetByUserIdAsync(userId, page: 1, pageSize: count);
        return entries.Select(MapEntryToDto);
    }

    public async Task<IEnumerable<CategorySpendingDto>> GetSpendingByCategoryAsync(
        int userId, DateTime from, DateTime to)
    {
        var entries = (await _journalRepo.GetByDateRangeAsync(userId, from, to)).ToList();

        // Nhóm chi tiêu theo account Expense
        var result = entries
            .SelectMany(e => e.JournalDetails)
            .Where(d => d.Account?.TypeId == TypeExpense && (d.Debit ?? 0) > 0)
            .GroupBy(d => new { d.AccountId, d.Account?.Name, d.Account?.IconName, d.Account?.Color })
            .Select(g => new CategorySpendingDto
            {
                AccountId   = g.Key.AccountId,
                AccountName = g.Key.Name ?? "Unknown",
                IconName    = g.Key.IconName,
                Color       = g.Key.Color,
                Amount      = g.Sum(d => d.Debit ?? 0)
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        // Tính percentage
        var total = result.Sum(c => c.Amount);
        foreach (var item in result)
            item.Percentage = total > 0 ? Math.Round(item.Amount / total * 100, 1) : 0;

        return result;
    }

    public async Task<MonthlyTrendDto> GetMonthlyTrendAsync(int userId, int months = 6)
    {
        var now    = DateTime.UtcNow;
        var points = new List<MonthlyTrendPointDto>();

        for (int i = months - 1; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
            var monthEnd   = monthStart.AddMonths(1).AddSeconds(-1);

            var cashFlow = await GetCashFlowInternalAsync(userId, monthStart, monthEnd);

            points.Add(new MonthlyTrendPointDto
            {
                Month   = monthStart.ToString("MMM yyyy"),
                Income  = cashFlow.TotalIncome,
                Expense = cashFlow.TotalExpense
            });
        }

        return new MonthlyTrendDto { Points = points };
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private async Task<CashFlowSummaryDto> GetCashFlowInternalAsync(
        int userId, DateTime from, DateTime to)
    {
        var entries = (await _journalRepo.GetByDateRangeAsync(userId, from, to)).ToList();

        decimal income  = 0;
        decimal expense = 0;

        foreach (var entry in entries)
        {
            foreach (var detail in entry.JournalDetails)
            {
                if (detail.Account?.TypeId == TypeRevenue)
                    income  += detail.Credit ?? 0;
                if (detail.Account?.TypeId == TypeExpense)
                    expense += detail.Debit  ?? 0;
            }
        }

        return new CashFlowSummaryDto
        {
            TotalIncome  = income,
            TotalExpense = expense,
            NetCashFlow  = income - expense,
            From         = from,
            To           = to
        };
    }

    private static TransactionDto MapEntryToDto(JournalEntry e) => new()
    {
        JournalId       = e.JournalId,
        TransactionDate = e.TransactionDate,
        Description     = e.Description,
        CreatedAt       = e.CreatedAt,
        Details         = e.JournalDetails.Select(d => new JournalDetailDto
        {
            DetailId    = d.DetailId,
            AccountId   = d.AccountId,
            AccountName = d.Account?.Name,
            TypeId      = d.Account?.TypeId ?? 0,
            Debit       = d.Debit  ?? 0,
            Credit      = d.Credit ?? 0
        }).ToList()
    };
}