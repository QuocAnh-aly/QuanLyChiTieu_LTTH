using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class TransactionServiceTests
{
    private readonly Mock<IJournalRepository> _journalRepoMock;
    private readonly Mock<IAccountRepository> _accountRepoMock;
    private readonly Mock<IBudgetService> _budgetServiceMock;
    private readonly Mock<IBillRepository> _billRepoMock;
    private readonly TransactionService _service;
    private readonly int _userId = 1;

    public TransactionServiceTests()
    {
        _journalRepoMock  = new Mock<IJournalRepository>();
        _accountRepoMock  = new Mock<IAccountRepository>();
        _budgetServiceMock = new Mock<IBudgetService>();
        _billRepoMock     = new Mock<IBillRepository>();
        _service = new TransactionService(
            _journalRepoMock.Object,
            _accountRepoMock.Object,
            _budgetServiceMock.Object,
            _billRepoMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static JournalEntry MakeEntry(int journalId = 1, int userId = 1,
        decimal amount = 1000m, string desc = "Test transaction",
        int debitAccId = 1, int creditAccId = 2)
    {
        return new JournalEntry
        {
            JournalId       = journalId,
            UserId          = userId,
            TransactionDate = new DateTime(2026, 5, 15),
            Description     = desc,
            Notes           = null,
            Tags            = null,
            CreatedAt       = DateTime.UtcNow,
            JournalDetails  = new List<JournalDetail>
            {
                new()
                {
                    DetailId  = journalId * 10 + 1,
                    AccountId = debitAccId,
                    Debit     = amount,
                    Credit    = 0,
                    Account   = new Account
                    {
                        AccountId   = debitAccId,
                        TypeId      = 1,
                        Name        = "Debit Account",
                    },
                },
                new()
                {
                    DetailId  = journalId * 10 + 2,
                    AccountId = creditAccId,
                    Debit     = 0,
                    Credit    = amount,
                    Account   = new Account
                    {
                        AccountId   = creditAccId,
                        TypeId      = 4,
                        Name        = "Credit Account",
                    },
                },
            },
        };
    }

    private static JournalEntry MakeExpenseEntry(int journalId = 1, int userId = 1,
        decimal amount = 500m, string desc = "Expense",
        int assetAccId = 1, int expenseAccId = 5)
    {
        return new JournalEntry
        {
            JournalId       = journalId,
            UserId          = userId,
            TransactionDate = new DateTime(2026, 5, 15),
            Description     = desc,
            Notes           = null,
            Tags            = null,
            CreatedAt       = DateTime.UtcNow,
            JournalDetails  = new List<JournalDetail>
            {
                new()
                {
                    DetailId  = journalId * 10 + 1,
                    AccountId = expenseAccId,
                    Debit     = amount,
                    Credit    = 0,
                    Account   = new Account
                    {
                        AccountId   = expenseAccId,
                        TypeId      = 5, // Expense
                        Name        = "Groceries",
                    },
                },
                new()
                {
                    DetailId  = journalId * 10 + 2,
                    AccountId = assetAccId,
                    Debit     = 0,
                    Credit    = amount,
                    Account   = new Account
                    {
                        AccountId   = assetAccId,
                        TypeId      = 1, // Asset
                        Name        = "Checking",
                    },
                },
            },
        };
    }

    private static Account MakeAccount(int accountId = 1, int userId = 1, int typeId = 1,
        string name = "Checking", decimal balance = 1000m)
    {
        return new Account
        {
            AccountId    = accountId,
            UserId       = userId,
            TypeId       = typeId,
            Name         = name,
            IconName     = "Landmark",
            Color        = "blue",
            Balance      = balance,
            InitialBalance = balance,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
        };
    }

    private static void AssertDto(TransactionDto dto, int expectedId, string expectedDesc)
    {
        dto.Should().NotBeNull();
        dto.JournalId.Should().Be(expectedId);
        dto.Description.Should().Be(expectedDesc);
    }

    // ─── GetByDateRangeAndAccountAsync ──────────────────────────────────────

    [Fact]
    public async Task GetByDateRangeAndAccountAsync_ReturnsFiltered()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);
        var entries = new[] { MakeEntry(1), MakeEntry(2) };
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAndAccountAsync(_userId, from, to, 1))
            .ReturnsAsync(entries);

        var result = await _service.GetByDateRangeAndAccountAsync(_userId, from, to, 1);

        result.Should().HaveCount(2);
        result.First().JournalId.Should().Be(1);
        _journalRepoMock.Verify(
            r => r.GetByDateRangeAndAccountAsync(_userId, from, to, 1), Times.Once);
    }

    [Fact]
    public async Task GetByDateRangeAndAccountAsync_EmptyResult_ReturnsEmpty()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAndAccountAsync(_userId, from, to, 999))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetByDateRangeAndAccountAsync(_userId, from, to, 999);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetByDateRangeAndAccountAsync_DifferentAccount_ReturnsEmpty()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);
        // Entry is for accountId=1, but we query accountId=2
        var entry = MakeEntry(1, debitAccId: 1, creditAccId: 1);
        _journalRepoMock.Setup(r => r.GetByDateRangeAndAccountAsync(_userId, from, to, 1))
            .ReturnsAsync(new[] { entry });
        _journalRepoMock.Setup(r => r.GetByDateRangeAndAccountAsync(_userId, from, to, 2))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetByDateRangeAndAccountAsync(_userId, from, to, 2);

        result.Should().BeEmpty();
    }

    // ─── GetByUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetByUserAsync_ReturnsPagedResults()
    {
        var entries = new[] { MakeEntry(1), MakeEntry(2), MakeEntry(3) };
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 20))
            .ReturnsAsync(entries);

        var result = await _service.GetByUserAsync(_userId, 1, 20);

        result.Should().HaveCount(3);
        result.First().JournalId.Should().Be(1);
    }

    [Fact]
    public async Task GetByUserAsync_EmptyPage_ReturnsEmpty()
    {
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 99, 20))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetByUserAsync(_userId, 99, 20);

        result.Should().BeEmpty();
    }

    // ─── GetByDateRangeAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetByDateRangeAsync_ReturnsEntriesInRange()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);
        var entries = new[] { MakeEntry(1), MakeEntry(2) };
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(entries);

        var result = await _service.GetByDateRangeAsync(_userId, from, to);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByDateRangeAsync_OutOfRange_ReturnsEmpty()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 1, 31);
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetByDateRangeAsync(_userId, from, to);

        result.Should().BeEmpty();
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnEntry_ReturnsDto()
    {
        var entry = MakeEntry(42);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(42)).ReturnsAsync(entry);

        var result = await _service.GetByIdAsync(_userId, 42);

        AssertDto(result, 42, "Test transaction");
        result.Details.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByIdAsync_OtherUsersEntry_ThrowsUnauthorized()
    {
        var entry = MakeEntry(1, userId: 99);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(entry);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(999))
            .ReturnsAsync((JournalEntry?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesAndReturnsDto()
    {
        var request = new CreateTransactionDto
        {
            DebitAccountId  = 1,
            CreditAccountId = 2,
            Amount          = 500m,
            Description     = "Payment",
        };

        var debitAccount  = MakeAccount(1, typeId: 1, balance: 1000m);
        var creditAccount = MakeAccount(2, typeId: 4, balance: 0m);

        _accountRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(debitAccount);
        _accountRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(creditAccount);
        _journalRepoMock
            .Setup(r => r.CreateWithDetailsAsync(It.IsAny<JournalEntry>(),
                It.IsAny<IEnumerable<JournalDetail>>()))
            .ReturnsAsync((JournalEntry e, IEnumerable<JournalDetail> _) =>
            {
                e.JournalId = 99;
                e.JournalDetails = new List<JournalDetail>
                {
                    new() { DetailId = 991, AccountId = 1, Debit = 500m, Credit = 0 },
                    new() { DetailId = 992, AccountId = 2, Debit = 0, Credit = 500m },
                };
                return e;
            });

        var result = await _service.CreateAsync(_userId, request);

        result.JournalId.Should().Be(99);
        result.Description.Should().Be("Payment");
        _accountRepoMock.Verify(r => r.UpdateBalanceAsync(1, 500m), Times.Once);
        _accountRepoMock.Verify(r => r.UpdateBalanceAsync(2, 500m), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ExpenseCategory_FindsExistingAccount_AndCreatesTransaction()
    {
        var request = new CreateTransactionDto
        {
            DebitAccountId      = 10,
            CreditAccountId     = 2,
            Amount              = 100m,
            Description         = "Groceries",
            ExpenseCategoryName = "Groceries",
            BudgetId            = 50,
        };

        var expenseAccount = MakeAccount(10, typeId: 5, name: "Groceries");
        var creditAccount  = MakeAccount(2, typeId: 1, name: "Checking", balance: 500m);

        // Existing expense account found by id
        _accountRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(expenseAccount);
        _accountRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(creditAccount);
        // Ngân sách 50 thuộc danh mục (account) 10
        _budgetServiceMock
            .Setup(r => r.GetExpenseBudgetByIdAsync(_userId, 50))
            .ReturnsAsync(new BudgetDto { BudgetId = 50, AccountId = 10 });
        _journalRepoMock
            .Setup(r => r.CreateWithDetailsAsync(It.IsAny<JournalEntry>(),
                It.IsAny<IEnumerable<JournalDetail>>()))
            .ReturnsAsync((JournalEntry e, IEnumerable<JournalDetail> _) =>
            {
                e.JournalId = 100;
                e.JournalDetails = new List<JournalDetail>();
                return e;
            });

        var result = await _service.CreateAsync(_userId, request);

        // Should NOT auto-create a new account
        _accountRepoMock.Verify(r => r.CreateAsync(It.IsAny<Account>()), Times.Never);
        // Should update spent on the chosen budget
        _budgetServiceMock.Verify(r => r.UpdateSpentForBudgetAsync(50, 100m), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ExpenseCategory_NotFound_AutoCreatesAccount()
    {
        var request = new CreateTransactionDto
        {
            CreditAccountId     = 2,
            Amount              = 100m,
            Description         = "Groceries",
            ExpenseCategoryName = "NonExistentCategory",
        };

        var newExpenseAccount = MakeAccount(10, typeId: 5, name: "NonExistentCategory");
        var creditAccount     = MakeAccount(2, typeId: 1, name: "Checking", balance: 500m);

        // No existing expense account (id 0) → will auto-create
        _accountRepoMock
            .Setup(r => r.CreateAsync(It.Is<Account>(a =>
                a.TypeId == 5 && a.Name == "NonExistentCategory")))
            .ReturnsAsync(newExpenseAccount);

        _accountRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(newExpenseAccount);
        _accountRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(creditAccount);

        _journalRepoMock
            .Setup(r => r.CreateWithDetailsAsync(It.IsAny<JournalEntry>(),
                It.IsAny<IEnumerable<JournalDetail>>()))
            .ReturnsAsync((JournalEntry e, IEnumerable<JournalDetail> _) =>
            {
                e.JournalId = 101;
                e.JournalDetails = new List<JournalDetail>();
                return e;
            });

        var result = await _service.CreateAsync(_userId, request);

        // Should have auto-created the account
        _accountRepoMock.Verify(r => r.CreateAsync(It.Is<Account>(a =>
            a.TypeId == 5 && a.Name == "NonExistentCategory")), Times.Once);
        // Không gắn ngân sách (request không có BudgetId) → không cộng vào ngân sách nào
        _budgetServiceMock.Verify(
            r => r.UpdateSpentForBudgetAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
        result.Should().NotBeNull();
        result.Description.Should().Be("Groceries");
    }

    [Fact]
    public async Task CreateAsync_InvalidDebitAccount_ThrowsKeyNotFound()
    {
        var request = new CreateTransactionDto
        {
            DebitAccountId  = 999,
            CreditAccountId = 2,
            Amount          = 100m,
        };

        _accountRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Account?)null);

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_OtherUsersAccount_ThrowsUnauthorized()
    {
        var request = new CreateTransactionDto
        {
            DebitAccountId  = 1,
            CreditAccountId = 2,
            Amount          = 100m,
        };

        _accountRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(MakeAccount(1, userId: 99));     // other user
        _accountRepoMock.Setup(r => r.GetByIdAsync(2))
            .ReturnsAsync(MakeAccount(2));

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnEntry_UpdatesFields()
    {
        var existing = MakeEntry(1);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(existing);
        _journalRepoMock
            .Setup(r => r.UpdateEntryAsync(1, "Updated desc", "New notes", "tag1", It.IsAny<DateTime>()))
            .ReturnsAsync(true);
        _journalRepoMock
            .Setup(r => r.GetWithDetailsAsync(1))
            .ReturnsAsync(MakeEntry(1, desc: "Updated desc"));

        var request = new UpdateTransactionDto
        {
            Description = "Updated desc",
            Notes       = "New notes",
            Tags        = "tag1",
        };

        var result = await _service.UpdateAsync(_userId, 1, request);

        result.Description.Should().Be("Updated desc");
    }

    [Fact]
    public async Task UpdateAsync_OtherUsersEntry_ThrowsUnauthorized()
    {
        var entry = MakeEntry(1, userId: 99);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(entry);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateTransactionDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateAsync_NonExistent_ThrowsKeyNotFound()
    {
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(999))
            .ReturnsAsync((JournalEntry?)null);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 999, new UpdateTransactionDto()))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnEntry_DeletesAndReturnsTrue()
    {
        var entry = MakeEntry(1);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(entry);
        _journalRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);
        _accountRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(MakeAccount(1));
        _accountRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(MakeAccount(2));

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
        _journalRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_OtherUsersEntry_ThrowsUnauthorized()
    {
        var entry = MakeEntry(1, userId: 99);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(entry);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();

        _journalRepoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsKeyNotFound()
    {
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(999))
            .ReturnsAsync((JournalEntry?)null);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── GetCashFlowAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetCashFlowAsync_CalculatesIncomeAndExpense()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);

        // Entry 1: revenue entry -> income (typeId=4)
        var revenueEntry = MakeEntry(1, creditAccId: 3);   // creditAcc has typeId=4 (Revenue)
        // Entry 2: expense entry -> expense (typeId=5)
        var expenseEntry = MakeExpenseEntry(2);

        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(new[] { revenueEntry, expenseEntry });

        var result = await _service.GetCashFlowAsync(_userId, from, to);

        result.TotalIncome.Should().Be(1000m);    // from revenue entry
        result.TotalExpense.Should().Be(500m);    // from expense entry
        result.NetCashFlow.Should().Be(500m);
        result.From.Should().Be(from);
        result.To.Should().Be(to);
    }

    [Fact]
    public async Task GetCashFlowAsync_EmptyRange_ReturnsZeros()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);

        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetCashFlowAsync(_userId, from, to);

        result.TotalIncome.Should().Be(0);
        result.TotalExpense.Should().Be(0);
        result.NetCashFlow.Should().Be(0);
    }

    [Fact]
    public async Task GetCashFlowAsync_OnlyIncome_ReturnsCorrectly()
    {
        var from = new DateTime(2026, 5, 1);
        var to   = new DateTime(2026, 5, 31);

        var entries = new[]
        {
            MakeEntry(1, creditAccId: 3),    // creditAcc typeId=4 (Revenue)
        };

        _journalRepoMock
            .Setup(r => r.GetByDateRangeAsync(_userId, from, to))
            .ReturnsAsync(entries);

        var result = await _service.GetCashFlowAsync(_userId, from, to);

        result.TotalIncome.Should().Be(1000m);
        result.TotalExpense.Should().Be(0);
        result.NetCashFlow.Should().Be(1000m);
    }

    // ─── MapToDto contract ──────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_Dto_HasCorrectStructure()
    {
        var entry = MakeEntry(7);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(7)).ReturnsAsync(entry);

        var result = await _service.GetByIdAsync(_userId, 7);

        result.JournalId.Should().Be(7);
        result.TransactionDate.Should().Be(new DateTime(2026, 5, 15));
        result.Details.Should().HaveCount(2);

        var debitDetail = result.Details.First(d => d.Debit > 0);
        debitDetail.AccountId.Should().Be(1);
        debitDetail.Debit.Should().Be(1000m);
        debitDetail.Credit.Should().Be(0);

        var creditDetail = result.Details.First(d => d.Credit > 0);
        creditDetail.AccountId.Should().Be(2);
        creditDetail.Credit.Should().Be(1000m);
        creditDetail.Debit.Should().Be(0);
    }

    [Fact]
    public async Task GetByIdAsync_Dto_TotalAmountIsCorrect()
    {
        var entry = MakeEntry(7);
        _journalRepoMock.Setup(r => r.GetWithDetailsAsync(7)).ReturnsAsync(entry);

        var result = await _service.GetByIdAsync(_userId, 7);

        result.TotalAmount.Should().Be(1000m);
    }
}
