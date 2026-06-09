using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class BillServiceTests
{
    private readonly Mock<IBillRepository> _billRepoMock;
    private readonly Mock<ITransactionService> _transactionServiceMock;
    private readonly BillService _service;
    private readonly int _userId = 1;

    public BillServiceTests()
    {
        _billRepoMock = new Mock<IBillRepository>();
        _transactionServiceMock = new Mock<ITransactionService>();
        _service = new BillService(_billRepoMock.Object, _transactionServiceMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Bill MakeBill(int billId = 1, int userId = 1,
        string name = "Electricity", decimal min = 200m, decimal max = 300m,
        string freq = "monthly")
    {
        return new Bill
        {
            BillId    = billId,
            UserId    = userId,
            Name      = name,
            AmountMin = min,
            AmountMax = max,
            Date      = new DateTime(2026, 1, 15),
            RepeatFreq = freq,
            Skip      = 0,
            Active    = true,
            Notes     = null,
            CreatedAt = new DateTime(2026, 1, 1),
        };
    }

    // ─── GetAllAsync (non-paged) ────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllBills()
    {
        var bills = new[] { MakeBill(1), MakeBill(2, name: "Water") };
        _billRepoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(bills);
        _billRepoMock.Setup(r => r.GetLinkedEntriesForUserAsync(_userId))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Name.Should().Be("Electricity");
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmpty()
    {
        _billRepoMock.Setup(r => r.GetByUserIdAsync(_userId))
            .ReturnsAsync(Array.Empty<Bill>());
        _billRepoMock.Setup(r => r.GetLinkedEntriesForUserAsync(_userId))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetAllPagedAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetAllPagedAsync_FirstPage_ReturnsPagedResult()
    {
        var bills = new[] { MakeBill(1), MakeBill(2) };
        _billRepoMock.Setup(r => r.GetLinkedEntriesForUserAsync(_userId))
            .ReturnsAsync(Array.Empty<JournalEntry>());
        _billRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 1, 10))
            .ReturnsAsync(new PaginatedResult<Bill>
            {
                Items = bills.ToList(),
                TotalCount = 2,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetAllPagedAsync(_userId, 1, 10);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.TotalPages.Should().Be(1);
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllPagedAsync_MultiplePages_ReturnsCorrectPage()
    {
        var bills = new[] { MakeBill(3, name: "Internet") };
        _billRepoMock.Setup(r => r.GetLinkedEntriesForUserAsync(_userId))
            .ReturnsAsync(Array.Empty<JournalEntry>());
        _billRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 2, 2))
            .ReturnsAsync(new PaginatedResult<Bill>
            {
                Items = bills.ToList(),
                TotalCount = 5,
                Page = 2,
                PageSize = 2,
            });

        var result = await _service.GetAllPagedAsync(_userId, 2, 2);

        result.Items.Should().ContainSingle().Which.Name.Should().Be("Internet");
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();   // total 5 items, page 2 of 3
    }

    [Fact]
    public async Task GetAllPagedAsync_LastPage_HasNoNextPage()
    {
        _billRepoMock.Setup(r => r.GetLinkedEntriesForUserAsync(_userId))
            .ReturnsAsync(Array.Empty<JournalEntry>());
        _billRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 3, 2))
            .ReturnsAsync(new PaginatedResult<Bill>
            {
                Items = new List<Bill> { MakeBill(5, name: "Phone") },
                TotalCount = 5,
                Page = 3,
                PageSize = 2,
            });

        var result = await _service.GetAllPagedAsync(_userId, 3, 2);

        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeTrue();
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnBill_ReturnsDto()
    {
        var bill = MakeBill(42);
        _billRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(bill);
        _billRepoMock.Setup(r => r.GetLinkedEntriesAsync(42))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.GetByIdAsync(_userId, 42);

        result.BillId.Should().Be(42);
        result.Name.Should().Be("Electricity");
    }

    [Fact]
    public async Task GetByIdAsync_PaidOnCycleDate_StatusIsPaid()
    {
        // Regression: bill whose cycle date is exactly today, paid today.
        // The period window must include today, so status = "paid".
        var today = DateTime.Today;
        var bill = MakeBill(5);
        bill.Date = today;
        bill.RepeatFreq = "monthly";
        var entry = new JournalEntry
        {
            JournalId = 100,
            UserId = _userId,
            BillId = 5,
            TransactionDate = today,
            JournalDetails = new List<JournalDetail> { new() { Debit = 250m } },
        };
        _billRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(bill);
        _billRepoMock.Setup(r => r.GetLinkedEntriesAsync(5)).ReturnsAsync(new[] { entry });

        var result = await _service.GetByIdAsync(_userId, 5);

        result.PaidStatus.Should().Be("paid");
    }

    [Fact]
    public async Task GetByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var bill = MakeBill(1, userId: 99);
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _billRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Bill?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesBill()
    {
        var request = new CreateBillDto
        {
            Name      = "Netflix",
            AmountMin = 150m,
            AmountMax = 150m,
            Date      = new DateTime(2026, 6, 1),
            RepeatFreq = "monthly",
        };

        _billRepoMock.Setup(r => r.CreateAsync(It.IsAny<Bill>()))
            .ReturnsAsync((Bill b) => { b.BillId = 10; return b; });

        var result = await _service.CreateAsync(_userId, request);

        result.BillId.Should().Be(10);
        result.Name.Should().Be("Netflix");
        result.AverageAmount.Should().Be(150m);
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnBill_UpdatesFields()
    {
        var existing = MakeBill(1);
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _billRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Bill>()))
            .ReturnsAsync((Bill b) => b);
        _billRepoMock.Setup(r => r.GetLinkedEntriesAsync(1))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var request = new UpdateBillDto { Name = "Updated Bill", AmountMin = 999m };

        var result = await _service.UpdateAsync(_userId, 1, request);

        result.Name.Should().Be("Updated Bill");
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnBill_DeletesAndReturnsTrue()
    {
        var existing = MakeBill(1);
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _billRepoMock.Setup(r => r.UnlinkAllEntriesAsync(1)).Returns(Task.CompletedTask);
        _billRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
        _billRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
        _billRepoMock.Verify(r => r.UnlinkAllEntriesAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsKeyNotFound()
    {
        _billRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Bill?)null);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── RescanAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task RescanAsync_ActiveBill_LinksEntries()
    {
        var bill = MakeBill(1, name: "Test Bill");
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);
        _billRepoMock.Setup(r => r.UnlinkAllEntriesAsync(1)).Returns(Task.CompletedTask);
        _billRepoMock.Setup(r => r.LinkEntriesByAmountAsync(1, _userId, 200m, 300m))
            .Returns(Task.CompletedTask);
        _billRepoMock.Setup(r => r.GetLinkedEntriesAsync(1))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var result = await _service.RescanAsync(_userId, 1);

        result.Name.Should().Be("Test Bill");
        _billRepoMock.Verify(r => r.LinkEntriesByAmountAsync(1, _userId, 200m, 300m), Times.Once);
    }

    [Fact]
    public async Task RescanAsync_InactiveBill_ThrowsInvalidOperation()
    {
        var bill = MakeBill(1);
        bill.Active = false;
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);

        await FluentActions.Invoking(() => _service.RescanAsync(_userId, 1))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    // ─── PayAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task PayAsync_ValidRequest_CreatesLinkedTransaction()
    {
        var bill = MakeBill(7, name: "Internet");
        _billRepoMock.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(bill);
        _billRepoMock.Setup(r => r.GetLinkedEntriesAsync(7))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        var request = new PayBillDto
        {
            WalletAccountId = 3,
            ExpenseAccountId = 9,
            Amount = 250m,
        };

        var result = await _service.PayAsync(_userId, 7, request);

        result.BillId.Should().Be(7);
        // Delegates to TransactionService with BillId stamped + bill name as description.
        _transactionServiceMock.Verify(t => t.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d =>
                d.BillId == 7 &&
                d.CreditAccountId == 3 &&
                d.DebitAccountId == 9 &&
                d.Amount == 250m &&
                d.Description == "Internet")), Times.Once);
    }

    [Fact]
    public async Task PayAsync_InactiveBill_ThrowsInvalidOperation()
    {
        var bill = MakeBill(1);
        bill.Active = false;
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);

        await FluentActions.Invoking(() =>
                _service.PayAsync(_userId, 1, new PayBillDto { WalletAccountId = 1, ExpenseAccountId = 1, Amount = 10m }))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task PayAsync_NonPositiveAmount_ThrowsArgument()
    {
        var bill = MakeBill(1);
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);

        await FluentActions.Invoking(() =>
                _service.PayAsync(_userId, 1, new PayBillDto { WalletAccountId = 1, ExpenseAccountId = 1, Amount = 0m }))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task PayAsync_MissingCategory_ThrowsArgument()
    {
        var bill = MakeBill(1);
        _billRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(bill);

        await FluentActions.Invoking(() =>
                _service.PayAsync(_userId, 1, new PayBillDto { WalletAccountId = 1, Amount = 10m }))
            .Should().ThrowAsync<ArgumentException>();
    }
}
