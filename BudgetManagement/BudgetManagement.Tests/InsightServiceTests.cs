using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Tests;

public class InsightServiceTests : IDisposable
{
    private readonly BudgetManagementDbContext _db;
    private readonly InsightService _service;
    private readonly int _userId = 1;
    private readonly int _otherUserId = 2;

    // Account IDs
    private readonly int _revenueAccId;
    private readonly int _expenseFoodId;
    private readonly int _expenseTransId;
    private readonly int _assetAccId;

    public InsightServiceTests()
    {
        var opts = new DbContextOptionsBuilder<BudgetManagementDbContext>()
            .UseInMemoryDatabase($"InsightTest_{Guid.NewGuid():N}")
            .Options;

        _db = new BudgetManagementDbContext(opts);
        SeedDatabase();
        _service = new InsightService(_db);
    }

    private void SeedDatabase()
    {
        // Account types
        var assetType = new AccountType { TypeId = 1, TypeName = "Assets" };
        var equityType = new AccountType { TypeId = 3, TypeName = "Equity" };
        var revenueType = new AccountType { TypeId = 4, TypeName = "Revenue" };
        var expenseType = new AccountType { TypeId = 5, TypeName = "Expense" };
        _db.AccountTypes.AddRange(assetType, equityType, revenueType, expenseType);

        // Accounts for user 1
        var revenueAcc = new Account
        {
            AccountId = 1, UserId = _userId, TypeId = 4, Name = "Salary",
            IconName = "DollarSign", Color = "green", AccountType = revenueType,
            IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        var expenseFood = new Account
        {
            AccountId = 2, UserId = _userId, TypeId = 5, Name = "Food & Dining",
            IconName = "Coffee", Color = "orange", AccountType = expenseType,
            IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        var expenseTrans = new Account
        {
            AccountId = 3, UserId = _userId, TypeId = 5, Name = "Transportation",
            IconName = "Car", Color = "blue", AccountType = expenseType,
            IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        var assetAcc = new Account
        {
            AccountId = 4, UserId = _userId, TypeId = 1, Name = "Checking",
            IconName = "Landmark", Color = "green", AccountType = assetType,
            IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        _db.Accounts.AddRange(revenueAcc, expenseFood, expenseTrans, assetAcc);

        // Accounts for user 2 (should be excluded from user 1 queries)
        var otherExpense = new Account
        {
            AccountId = 5, UserId = _otherUserId, TypeId = 5, Name = "Other Food",
            AccountType = expenseType, IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        _db.Accounts.Add(otherExpense);

        // Journal entries + details for user 1
        // Expense: Food & Dining — 200,000
        // Expense: Transportation — 100,000
        // Income: Salary — 10,000,000
        // Expense: Food & Dining (different month) — 150,000
        var jan = new DateTime(2026, 1, 15);
        var feb = new DateTime(2026, 2, 10);

        var entry1 = new JournalEntry
        {
            JournalId = 1, UserId = _userId, TransactionDate = jan,
            Description = "Groceries", Tags = "food,grocery",
            CreatedAt = DateTime.UtcNow,
        };
        var entry2 = new JournalEntry
        {
            JournalId = 2, UserId = _userId, TransactionDate = jan,
            Description = "Bus ticket", Tags = "transport,commute",
            CreatedAt = DateTime.UtcNow,
        };
        var entry3 = new JournalEntry
        {
            JournalId = 3, UserId = _userId, TransactionDate = jan,
            Description = "Monthly salary", Tags = "salary,income",
            CreatedAt = DateTime.UtcNow,
        };
        var entry4 = new JournalEntry
        {
            JournalId = 4, UserId = _userId, TransactionDate = feb,
            Description = "Restaurant", Tags = "food,dining",
            CreatedAt = DateTime.UtcNow,
        };
        _db.JournalEntries.AddRange(entry1, entry2, entry3, entry4);

        // Details
        _db.JournalDetails.AddRange(
            // Expense transaction 1: Food 200k
            new JournalDetail { DetailId = 1, JournalId = 1, AccountId = 2, Debit = 200000, Credit = 0 },
            new JournalDetail { DetailId = 2, JournalId = 1, AccountId = 4, Debit = 0, Credit = 200000 },
            // Expense transaction 2: Transport 100k
            new JournalDetail { DetailId = 3, JournalId = 2, AccountId = 3, Debit = 100000, Credit = 0 },
            new JournalDetail { DetailId = 4, JournalId = 2, AccountId = 4, Debit = 0, Credit = 100000 },
            // Income transaction 3: Salary 10M
            new JournalDetail { DetailId = 5, JournalId = 3, AccountId = 4, Debit = 10000000, Credit = 0 },
            new JournalDetail { DetailId = 6, JournalId = 3, AccountId = 1, Debit = 0, Credit = 10000000 },
            // Expense transaction 4: Restaurant 150k (February)
            new JournalDetail { DetailId = 7, JournalId = 4, AccountId = 2, Debit = 150000, Credit = 0 },
            new JournalDetail { DetailId = 8, JournalId = 4, AccountId = 4, Debit = 0, Credit = 150000 }
        );

        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }

    // ─── ExpenseTotalAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task ExpenseTotalAsync_ReturnsTotalAndCount()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = await _service.ExpenseTotalAsync(_userId, from, to);

        result.Total.Should().Be(300000m);    // 200k + 100k
        result.Count.Should().Be(2);           // 2 transactions in Jan
        result.From.Should().Be(from);
        result.To.Should().Be(to);
    }

    [Fact]
    public async Task ExpenseTotalAsync_AllMonths_IncludesFebruary()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 2, 28);

        var result = await _service.ExpenseTotalAsync(_userId, from, to);

        result.Total.Should().Be(450000m);    // 200k + 100k + 150k
        result.Count.Should().Be(3);           // 3 transactions
    }

    [Fact]
    public async Task ExpenseTotalAsync_NoData_ReturnsZero()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var result = await _service.ExpenseTotalAsync(_userId, from, to);

        result.Total.Should().Be(0);
        result.Count.Should().Be(0);
    }

    [Fact]
    public async Task ExpenseTotalAsync_OtherUser_ReturnsZero()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 12, 31);

        var result = await _service.ExpenseTotalAsync(_otherUserId, from, to);

        result.Total.Should().Be(0);
        result.Count.Should().Be(0);
    }

    // ─── IncomeTotalAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task IncomeTotalAsync_ReturnsTotalAndCount()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = await _service.IncomeTotalAsync(_userId, from, to);

        result.Total.Should().Be(10_000_000m);
        result.Count.Should().Be(1);
    }

    [Fact]
    public async Task IncomeTotalAsync_NoIncome_ReturnsZero()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var result = await _service.IncomeTotalAsync(_userId, from, to);

        result.Total.Should().Be(0);
        result.Count.Should().Be(0);
    }

    // ─── ExpenseByCategoryAsync ────────────────────────────────────────────

    [Fact]
    public async Task ExpenseByCategoryAsync_GroupsByExpenseAccount()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = (await _service.ExpenseByCategoryAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(2);
        result[0].Label.Should().Be("Food & Dining");
        result[0].Amount.Should().Be(200000m);
        result[0].Count.Should().Be(1);
        result[0].Key.Should().Be("2");

        result[1].Label.Should().Be("Transportation");
        result[1].Amount.Should().Be(100000m);
        result[1].Count.Should().Be(1);
        result[1].Key.Should().Be("3");
    }

    [Fact]
    public async Task ExpenseByCategoryAsync_OrderedByAmountDesc()
    {
        var from = new DateTime(2026, 2, 1);
        var to   = new DateTime(2026, 2, 28);

        var result = (await _service.ExpenseByCategoryAsync(_userId, from, to)).ToList();

        result.Should().ContainSingle();
        result[0].Label.Should().Be("Food & Dining");
        result[0].Amount.Should().Be(150000m);
    }

    [Fact]
    public async Task ExpenseByCategoryAsync_NoData_ReturnsEmpty()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var result = await _service.ExpenseByCategoryAsync(_userId, from, to);

        result.Should().BeEmpty();
    }

    // ─── IncomeByCategoryAsync ─────────────────────────────────────────────

    [Fact]
    public async Task IncomeByCategoryAsync_GroupsByRevenueAccount()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = (await _service.IncomeByCategoryAsync(_userId, from, to)).ToList();

        result.Should().ContainSingle();
        result[0].Label.Should().Be("Salary");
        result[0].Amount.Should().Be(10_000_000m);
        result[0].Count.Should().Be(1);
    }

    // ─── ExpenseByTagAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task ExpenseByTagAsync_GroupsByTag()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = (await _service.ExpenseByTagAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(4); // food, grocery, transport, commute
        result.Any(r => r.Label == "food" && r.Amount == 200000m).Should().BeTrue();
        result.Any(r => r.Label == "grocery" && r.Amount == 200000m).Should().BeTrue();
        result.Any(r => r.Label == "transport" && r.Amount == 100000m).Should().BeTrue();
        result.Any(r => r.Label == "commute" && r.Amount == 100000m).Should().BeTrue();
    }

    [Fact]
    public async Task ExpenseByTagAsync_NoTags_FallsBackToNoTag()
    {
        // Create an entry with no tags
        var entry = new JournalEntry
        {
            JournalId = 10, UserId = _userId,
            TransactionDate = new DateTime(2026, 1, 20),
            Description = "No tag purchase", Tags = null,
            CreatedAt = DateTime.UtcNow,
        };
        _db.JournalEntries.Add(entry);
        _db.JournalDetails.Add(new JournalDetail
        {
            DetailId = 20, JournalId = 10, AccountId = 2, Debit = 50000, Credit = 0
        });
        _db.JournalDetails.Add(new JournalDetail
        {
            DetailId = 21, JournalId = 10, AccountId = 4, Debit = 0, Credit = 50000
        });
        _db.SaveChanges();

        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = (await _service.ExpenseByTagAsync(_userId, from, to)).ToList();

        result.Any(r => r.Label == "(no-tag)" && r.Amount == 50000m).Should().BeTrue();
    }

    // ─── IncomeByTagAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task IncomeByTagAsync_GroupsByTag()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var result = (await _service.IncomeByTagAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(2); // salary, income
        result.Any(r => r.Label == "salary" && r.Amount == 10_000_000m).Should().BeTrue();
        result.Any(r => r.Label == "income" && r.Amount == 10_000_000m).Should().BeTrue();
    }

    // ─── MonthlyTrendAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task MonthlyTrendAsync_ReturnsMonthlyAggregation()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 2, 28);

        var result = (await _service.MonthlyTrendAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(2);
        result[0].Month.Should().Be("2026-01");
        result[0].Income.Should().Be(10_000_000m);
        result[0].Expense.Should().Be(300000m);

        result[1].Month.Should().Be("2026-02");
        result[1].Income.Should().Be(0m);
        result[1].Expense.Should().Be(150000m);
    }

    [Fact]
    public async Task MonthlyTrendAsync_EmptyRange_ReturnsZeros()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 3, 31);

        var result = (await _service.MonthlyTrendAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(3);  // 3 months
        result.All(r => r.Income == 0 && r.Expense == 0).Should().BeTrue();
    }

    [Fact]
    public async Task MonthlyTrendAsync_FillsGapsWithZeros()
    {
        // Data only in Jan and April — should fill Feb, March with zeros
        var entry = new JournalEntry
        {
            JournalId = 20, UserId = _userId,
            TransactionDate = new DateTime(2026, 4, 5),
            Description = "April food", Tags = "food",
            CreatedAt = DateTime.UtcNow,
        };
        _db.JournalEntries.Add(entry);
        _db.JournalDetails.Add(new JournalDetail
        {
            DetailId = 30, JournalId = 20, AccountId = 2, Debit = 100000, Credit = 0
        });
        _db.JournalDetails.Add(new JournalDetail
        {
            DetailId = 31, JournalId = 20, AccountId = 4, Debit = 0, Credit = 100000
        });
        _db.SaveChanges();

        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 4, 30);

        var result = (await _service.MonthlyTrendAsync(_userId, from, to)).ToList();

        result.Should().HaveCount(4);
        result[0].Month.Should().Be("2026-01");
        result[0].Expense.Should().Be(300000m);

        result[1].Month.Should().Be("2026-02");
        result[1].Expense.Should().Be(150000m);  // from Feb data

        result[2].Month.Should().Be("2026-03");
        result[2].Expense.Should().Be(0m);      // gap — zero

        result[3].Month.Should().Be("2026-04");
        result[3].Expense.Should().Be(100000m);
    }
}
