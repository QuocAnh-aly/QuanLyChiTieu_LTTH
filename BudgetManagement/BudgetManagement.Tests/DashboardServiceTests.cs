using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class DashboardServiceTests
{
    private readonly Mock<IAccountRepository> _accountRepoMock;
    private readonly Mock<IJournalRepository> _journalRepoMock;
    private readonly Mock<IAccountService> _accountServiceMock;
    private readonly DashboardService _service;
    private readonly int _userId = 1;

    public DashboardServiceTests()
    {
        _accountRepoMock   = new Mock<IAccountRepository>();
        _journalRepoMock   = new Mock<IJournalRepository>();
        _accountServiceMock = new Mock<IAccountService>();
        _service = new DashboardService(
            _accountRepoMock.Object,
            _journalRepoMock.Object,
            _accountServiceMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static WalletSummaryDto MakeWallet(decimal assets = 10000m,
        decimal liabilities = 2000m, decimal savings = 5000m)
    {
        return new WalletSummaryDto
        {
            TotalAssets      = assets,
            TotalLiabilities = liabilities,
            TotalSavings     = savings,
            NetWorth         = assets + savings - liabilities,
        };
    }

    private static JournalEntry MakeEntry(int journalId = 1, int userId = 1,
        decimal debitAmount = 100m, decimal creditAmount = 100m,
        int debitTypeId = 5, int creditTypeId = 4,
        string desc = "Test", DateTime? date = null)
    {
        return new JournalEntry
        {
            JournalId       = journalId,
            UserId          = userId,
            TransactionDate = date ?? DateTime.UtcNow,
            Description     = desc,
            CreatedAt       = DateTime.UtcNow,
            JournalDetails  = new List<JournalDetail>
            {
                new()
                {
                    DetailId  = journalId * 10 + 1,
                    AccountId = 1,
                    Debit     = debitAmount,
                    Credit    = 0,
                    Account   = new Account
                    {
                        AccountId = 1,
                        TypeId    = debitTypeId,
                        Name      = debitTypeId == 5 ? "Expense Account" : "Asset Account",
                        IconName  = "Coffee",
                        Color     = "orange",
                    },
                },
                new()
                {
                    DetailId  = journalId * 10 + 2,
                    AccountId = 2,
                    Debit     = 0,
                    Credit    = creditAmount,
                    Account   = new Account
                    {
                        AccountId = 2,
                        TypeId    = creditTypeId,
                        Name      = creditTypeId == 4 ? "Revenue Account" : "Liability Account",
                    },
                },
            },
        };
    }

    // ─── GetRecentTransactionsAsync ─────────────────────────────────────────

    [Fact]
    public async Task GetRecentTransactionsAsync_ReturnsRequestedCount()
    {
        var entries = new[] { MakeEntry(1), MakeEntry(2), MakeEntry(3) };
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 3))
            .ReturnsAsync(entries);

        var result = await _service.GetRecentTransactionsAsync(_userId, 3);

        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetRecentTransactionsAsync_DefaultCount_Returns5()
    {
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 5))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetRecentTransactionsAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetSpendingByCategoryAsync ─────────────────────────────────────────

    [Fact]
    public async Task GetSpendingByCategoryAsync_GroupsByExpenseAccount()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to   = DateTime.UtcNow;

        var entries = new[]
        {
            MakeEntry(1, debitTypeId: 5, debitAmount: 100m, desc: "Coffee"),
            MakeEntry(2, debitTypeId: 5, debitAmount: 200m, desc: "Lunch"),
        };
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(entries);

        var result = (await _service.GetSpendingByCategoryAsync(_userId, from, to)).ToList();

        result.Should().ContainSingle();
        result[0].Amount.Should().Be(300m);  // 100 + 200
        result[0].AccountName.Should().Be("Expense Account");
        result[0].Percentage.Should().Be(100m);
    }

    [Fact]
    public async Task GetSpendingByCategoryAsync_NoExpenses_ReturnsEmpty()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to   = DateTime.UtcNow;
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetSpendingByCategoryAsync(_userId, from, to);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSpendingByCategoryAsync_OnlyRevenue_ReturnsEmpty()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to   = DateTime.UtcNow;
        var entries = new[] { MakeEntry(1, debitTypeId: 1, creditTypeId: 4, debitAmount: 0, creditAmount: 500m) };
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(entries);

        var result = await _service.GetSpendingByCategoryAsync(_userId, from, to);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSpendingByCategoryAsync_MultipleCategories_CalculatesPercentages()
    {
        var from = DateTime.UtcNow.AddDays(-30);
        var to   = DateTime.UtcNow;

        var entries = new[]
        {
            MakeEntry(1, debitTypeId: 5, debitAmount: 300m, desc: "Groceries"),
            MakeEntry(2, debitTypeId: 5, debitAmount: 100m, desc: "Transport"),
        };
        // Override second entry's detail to have a different account ID
        entries[1].JournalDetails.First(d => d.Debit > 0).AccountId = 3;
        entries[1].JournalDetails.First(d => d.Debit > 0).Account!.Name = "Transport";
        entries[1].JournalDetails.First(d => d.Debit > 0).Account!.AccountId = 3;

        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(entries);

        var result = (await _service.GetSpendingByCategoryAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(2);
        result[0].Amount.Should().Be(300m);   // largest first
        result[0].Percentage.Should().Be(75m); // 300/400*100
        result[1].Amount.Should().Be(100m);
        result[1].Percentage.Should().Be(25m); // 100/400*100
    }

    // ─── GetMonthlyTrendAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetMonthlyTrendAsync_ReturnsRequestedMonths()
    {
        // Will need to return some entries for cash flow calculation
        var from = DateTime.UtcNow.AddDays(-30);
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, It.IsAny<DateTime>(), It.IsAny<DateTime>()))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetMonthlyTrendAsync(_userId, 6);

        result.Points.Should().HaveCount(6);
        result.Points.All(p => p.Income == 0).Should().BeTrue();
    }

    // ─── GetSummaryAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetSummaryAsync_ReturnsCompleteDashboard()
    {
        var wallet = MakeWallet(assets: 50000m, liabilities: 10000m, savings: 20000m);

        _accountServiceMock
            .Setup(s => s.GetWalletSummaryAsync(_userId))
            .ReturnsAsync(wallet);

        // Recent transactions
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 5))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        // Spending by category
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, It.IsAny<DateTime>(), It.IsAny<DateTime>()))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetSummaryAsync(_userId);

        result.TotalBalance.Should().Be(60000m);   // 50000 + 20000 - 10000
        result.TotalAssets.Should().Be(50000m);
        result.TotalLiabilities.Should().Be(10000m);
        result.TotalSavings.Should().Be(20000m);
        result.MonthlyIncome.Should().Be(0m);
        result.MonthlyExpense.Should().Be(0m);
        result.RecentTransactions.Should().BeEmpty();
        result.SpendingByCategory.Should().BeEmpty();
        result.MonthlyTrend.Should().NotBeNull();
    }
}
