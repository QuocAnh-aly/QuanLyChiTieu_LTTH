using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Tests;

public class SearchServiceTests : IDisposable
{
    private readonly BudgetManagementDbContext _db;
    private readonly SearchService _service;
    private readonly int _userId = 1;
    private readonly int _otherUserId = 2;

    public SearchServiceTests()
    {
        var opts = new DbContextOptionsBuilder<BudgetManagementDbContext>()
            .UseInMemoryDatabase($"SearchTest_{Guid.NewGuid():N}")
            .Options;

        _db = new BudgetManagementDbContext(opts);
        SeedDatabase();
        _service = new SearchService(_db);
    }

    private void SeedDatabase()
    {
        // Account types
        _db.AccountTypes.AddRange(
            new AccountType { TypeId = 1, TypeName = "Assets" },
            new AccountType { TypeId = 4, TypeName = "Revenue" },
            new AccountType { TypeId = 5, TypeName = "Expense" }
        );

        // Accounts
        _db.Accounts.AddRange(
            new Account
            {
                AccountId = 1, UserId = _userId, TypeId = 1, Name = "Checking Account",
                IconName = "Landmark", Color = "blue", Balance = 5000000m,
                CurrencyCode = "VND", IsActive = true, CreatedAt = DateTime.UtcNow,
            },
            new Account
            {
                AccountId = 2, UserId = _userId, TypeId = 4, Name = "Salary",
                IconName = "DollarSign", Color = "green", Balance = null,
                CurrencyCode = "VND", IsActive = true, CreatedAt = DateTime.UtcNow,
            },
            new Account
            {
                AccountId = 3, UserId = _userId, TypeId = 5, Name = "Food & Dining",
                IconName = "Coffee", Color = "orange", Balance = null,
                CurrencyCode = "VND", IsActive = true, CreatedAt = DateTime.UtcNow,
            },
            new Account
            {
                AccountId = 4, UserId = _userId, TypeId = 5, Name = "Transportation",
                IconName = "Car", Color = "blue", Balance = null,
                CurrencyCode = "VND", IsActive = true, CreatedAt = DateTime.UtcNow,
            },
            // Other user's account (should not appear)
            new Account
            {
                AccountId = 5, UserId = _otherUserId, TypeId = 1, Name = "Other Checking",
                Balance = 1000m, CurrencyCode = "USD", IsActive = true, CreatedAt = DateTime.UtcNow,
            }
        );

        // Journal entries
        var jan15 = new DateTime(2026, 1, 15);
        var feb10 = new DateTime(2026, 2, 10);

        _db.JournalEntries.AddRange(
            new JournalEntry
            {
                JournalId = 1, UserId = _userId, TransactionDate = jan15,
                Description = "Grocery shopping at Co.opmart",
                Notes = "Weekly groceries", Tags = "food,grocery",
                CreatedAt = DateTime.UtcNow,
            },
            new JournalEntry
            {
                JournalId = 2, UserId = _userId, TransactionDate = jan15,
                Description = "Bus pass monthly", Tags = "transport,commute",
                CreatedAt = DateTime.UtcNow,
            },
            new JournalEntry
            {
                JournalId = 3, UserId = _userId, TransactionDate = jan15,
                Description = "January salary", Notes = "Monthly", Tags = "salary,income",
                CreatedAt = DateTime.UtcNow,
            },
            new JournalEntry
            {
                JournalId = 4, UserId = _userId, TransactionDate = feb10,
                Description = "Restaurant dinner", Tags = "food,dining",
                CreatedAt = DateTime.UtcNow,
            },
            new JournalEntry
            {
                JournalId = 5, UserId = _otherUserId, TransactionDate = jan15,
                Description = "Other user transaction", Tags = "other",
                CreatedAt = DateTime.UtcNow,
            }
        );

        // Journal details (need these for the Include chains in SearchService)
        _db.JournalDetails.AddRange(
            new JournalDetail { DetailId = 1,  JournalId = 1, AccountId = 3, Debit = 200000,  Credit = 0 },
            new JournalDetail { DetailId = 2,  JournalId = 1, AccountId = 1, Debit = 0,       Credit = 200000 },
            new JournalDetail { DetailId = 3,  JournalId = 2, AccountId = 4, Debit = 100000,  Credit = 0 },
            new JournalDetail { DetailId = 4,  JournalId = 2, AccountId = 1, Debit = 0,       Credit = 100000 },
            new JournalDetail { DetailId = 5,  JournalId = 3, AccountId = 1, Debit = 10000000,Credit = 0 },
            new JournalDetail { DetailId = 6,  JournalId = 3, AccountId = 2, Debit = 0,       Credit = 10000000 },
            new JournalDetail { DetailId = 7,  JournalId = 4, AccountId = 3, Debit = 150000,  Credit = 0 },
            new JournalDetail { DetailId = 8,  JournalId = 4, AccountId = 1, Debit = 0,       Credit = 150000 },
            new JournalDetail { DetailId = 9,  JournalId = 5, AccountId = 5, Debit = 100,     Credit = 0 },
            new JournalDetail { DetailId = 10, JournalId = 5, AccountId = 5, Debit = 0,       Credit = 100 }
        );

        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }

    // ─── SearchTransactionsAsync ───────────────────────────────────────────

    [Fact]
    public async Task SearchTransactionsAsync_NoFilters_ReturnsAllUserTransactions()
    {
        var result = await _service.SearchTransactionsAsync(_userId, null, null, null, 100);

        result.Should().HaveCount(4);  // 4 transactions for user 1
    }

    [Fact]
    public async Task SearchTransactionsAsync_FiltersByDateRange()
    {
        var from = new DateTime(2026, 2, 1);
        var to   = new DateTime(2026, 2, 28);

        var result = await _service.SearchTransactionsAsync(_userId, null, from, to, 100);

        result.Should().ContainSingle()
              .Which.JournalId.Should().Be(4);  // only Feb transaction
    }

    [Fact]
    public async Task SearchTransactionsAsync_RespectsLimit()
    {
        var result = await _service.SearchTransactionsAsync(_userId, null, null, null, 2);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task SearchTransactionsAsync_DefaultLimit_Uses100()
    {
        // Using limit=0 should default to 100
        var result = await _service.SearchTransactionsAsync(_userId, null, null, null, 0);

        result.Should().HaveCount(4);  // all 4 entries fit within 100
    }

    [Fact]
    public async Task SearchTransactionsAsync_OnlyOwnUser()
    {
        var result = await _service.SearchTransactionsAsync(_otherUserId, null, null, null, 100);

        result.Should().ContainSingle()
              .Which.Description.Should().Be("Other user transaction");
    }

    [Fact]
    public async Task SearchTransactionsAsync_EmptyResult_ReturnsEmpty()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var result = await _service.SearchTransactionsAsync(_userId, null, from, to, 100);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchTransactionsAsync_OrderedByDateDesc()
    {
        var result = (await _service.SearchTransactionsAsync(_userId, null, null, null, 100)).ToList();

        result.First().TransactionDate.Should().Be(new DateTime(2026, 2, 10));  // Feb first
        result.Last().TransactionDate.Should().Be(new DateTime(2026, 1, 15));    // Jan last
    }

    [Fact]
    public async Task SearchTransactionsAsync_MapsSourceAndDestinationAccounts()
    {
        var result = (await _service.SearchTransactionsAsync(_userId, null, null, null, 100)).ToList();

        // Transaction 1: Debit=Food & Dining, Credit=Checking Account
        var tx1 = result.First(r => r.JournalId == 1);
        tx1.SourceAccount.Should().Be("Checking Account");
        tx1.DestinationAccount.Should().Be("Food & Dining");
        tx1.Amount.Should().Be(200000m);
    }

    // ─── CountTransactionsAsync ────────────────────────────────────────────

    [Fact]
    public async Task CountTransactionsAsync_CountsAllOwnTransactions()
    {
        var count = await _service.CountTransactionsAsync(_userId, null, null, null);

        count.Should().Be(4);
    }

    [Fact]
    public async Task CountTransactionsAsync_FiltersByDateRange()
    {
        var from = new DateTime(2026, 1, 1);
        var to   = new DateTime(2026, 1, 31);

        var count = await _service.CountTransactionsAsync(_userId, null, from, to);

        count.Should().Be(3);  // 3 transactions in January
    }

    [Fact]
    public async Task CountTransactionsAsync_NoMatch_ReturnsZero()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var count = await _service.CountTransactionsAsync(_userId, null, from, to);

        count.Should().Be(0);
    }

    // ─── SearchAccountsAsync ───────────────────────────────────────────────

    [Fact]
    public async Task SearchAccountsAsync_NoFilters_ReturnsAllOwnAccounts()
    {
        var result = await _service.SearchAccountsAsync(_userId, null, null);

        result.Should().HaveCount(4);  // 4 accounts for user 1
    }

    [Fact]
    public async Task SearchAccountsAsync_FiltersByType()
    {
        var result = await _service.SearchAccountsAsync(_userId, null, 5);  // Expense only

        result.Should().HaveCount(2);
        result.All(a => a.TypeId == 5).Should().BeTrue();
    }

    [Fact]
    public async Task SearchAccountsAsync_OnlyOwnUser()
    {
        var result = await _service.SearchAccountsAsync(_otherUserId, null, null);

        result.Should().ContainSingle()
              .Which.Name.Should().Be("Other Checking");
    }

    [Fact]
    public async Task SearchAccountsAsync_NoMatchType_ReturnsEmpty()
    {
        var result = await _service.SearchAccountsAsync(_userId, null, 99);  // non-existent type

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAccountsAsync_IncludesTypeName()
    {
        var result = await _service.SearchAccountsAsync(_userId, null, 4);  // Revenue

        result.Should().ContainSingle();
        result.First().TypeName.Should().Be("Revenue");
    }

    [Fact]
    public async Task SearchAccountsAsync_IncludesBalanceAndCurrency()
    {
        var result = await _service.SearchAccountsAsync(_userId, null, 1);  // Assets

        result.Should().ContainSingle();
        result.First().Balance.Should().Be(5000000m);
        result.First().CurrencyCode.Should().Be("VND");
    }

    [Fact]
    public async Task SearchAccountsAsync_OrderedByName()
    {
        var result = (await _service.SearchAccountsAsync(_userId, null, null)).ToList();

        result[0].Name.Should().Be("Checking Account");
        result[1].Name.Should().Be("Food & Dining");
        result[2].Name.Should().Be("Salary");
        result[3].Name.Should().Be("Transportation");
    }
}
