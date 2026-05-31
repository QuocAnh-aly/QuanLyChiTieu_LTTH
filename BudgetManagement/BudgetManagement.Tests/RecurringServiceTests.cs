using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class RecurringServiceTests
{
    private readonly Mock<IRecurringRepository> _recurringRepoMock;
    private readonly Mock<ITransactionService> _transactionServiceMock;
    private readonly RecurringService _service;
    private readonly int _userId = 1;

    public RecurringServiceTests()
    {
        _recurringRepoMock = new Mock<IRecurringRepository>();
        _transactionServiceMock = new Mock<ITransactionService>();
        _service = new RecurringService(_recurringRepoMock.Object, _transactionServiceMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static RecurringJournal MakeRecurring(int recurringId = 1, int userId = 1,
        string title = "Rent", decimal amount = 5000m, string freq = "monthly")
    {
        return new RecurringJournal
        {
            RecurringId     = recurringId,
            UserId          = userId,
            DebitAccountId  = 1,
            CreditAccountId = 2,
            DebitAccount    = new Account { AccountId = 1, Name = "Checking" },
            CreditAccount   = new Account { AccountId = 2, Name = "Expense" },
            Amount          = amount,
            Title           = title,
            Description     = title,
            Frequency       = freq,
            IntervalValue   = 1,
            NextRunDate     = new DateTime(2026, 6, 1),
            IsActive        = true,
            CreatedAt       = new DateTime(2026, 1, 1),
        };
    }

    // ─── GetByUserAsync (non-paged) ─────────────────────────────────────────

    [Fact]
    public async Task GetByUserAsync_ReturnsAllRecurrings()
    {
        var recurrings = new[] { MakeRecurring(1), MakeRecurring(2, title: "Insurance") };
        _recurringRepoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(recurrings);

        var result = await _service.GetByUserAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Title.Should().Be("Rent");
    }

    [Fact]
    public async Task GetByUserAsync_Empty_ReturnsEmpty()
    {
        _recurringRepoMock.Setup(r => r.GetByUserIdAsync(_userId))
            .ReturnsAsync(Array.Empty<RecurringJournal>());

        var result = await _service.GetByUserAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetByUserPagedAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetByUserPagedAsync_FirstPage_ReturnsPagedResult()
    {
        var recurrings = new[] { MakeRecurring(1), MakeRecurring(2) };
        _recurringRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 1, 10))
            .ReturnsAsync(new PaginatedResult<RecurringJournal>
            {
                Items = recurrings.ToList(),
                TotalCount = 2,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetByUserPagedAsync(_userId, 1, 10);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.TotalPages.Should().Be(1);
        result.HasPreviousPage.Should().BeFalse();
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetByUserPagedAsync_MiddlePage_HasNavigation()
    {
        var recurring = MakeRecurring(3, title: "Gym");
        _recurringRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 2, 2))
            .ReturnsAsync(new PaginatedResult<RecurringJournal>
            {
                Items = new List<RecurringJournal> { recurring },
                TotalCount = 7,
                Page = 2,
                PageSize = 2,
            });

        var result = await _service.GetByUserPagedAsync(_userId, 2, 2);

        result.Items.Should().ContainSingle().Which.Title.Should().Be("Gym");
        result.HasPreviousPage.Should().BeTrue();     // page 2 > 1
        result.HasNextPage.Should().BeTrue();         // total 7 items, page 2 of 4
        result.TotalPages.Should().Be(4);
    }

    [Fact]
    public async Task GetByUserPagedAsync_EmptyPage_ReturnsEmpty()
    {
        _recurringRepoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 99, 10))
            .ReturnsAsync(new PaginatedResult<RecurringJournal>
            {
                Items = new List<RecurringJournal>(),
                TotalCount = 5,
                Page = 99,
                PageSize = 10,
            });

        var result = await _service.GetByUserPagedAsync(_userId, 99, 10);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(5);
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnRecurring_ReturnsDto()
    {
        var recurring = MakeRecurring(42);
        _recurringRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(recurring);

        var result = await _service.GetByIdAsync(_userId, 42);

        result.RecurringId.Should().Be(42);
        result.Title.Should().Be("Rent");
        result.Amount.Should().Be(5000m);
        result.DebitAccountName.Should().Be("Checking");
        result.CreditAccountName.Should().Be("Expense");
    }

    [Fact]
    public async Task GetByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var recurring = MakeRecurring(1, userId: 99);
        _recurringRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(recurring);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _recurringRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((RecurringJournal?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesAndReturnsDto()
    {
        var request = new CreateRecurringDto
        {
            DebitAccountId  = 1,
            CreditAccountId = 2,
            Amount          = 1000m,
            Title           = "Subscription",
            Frequency       = "monthly",
            NextRunDate     = new DateTime(2026, 7, 1),
        };

        _recurringRepoMock.Setup(r => r.CreateAsync(It.IsAny<RecurringJournal>()))
            .ReturnsAsync((RecurringJournal r) => { r.RecurringId = 10; return r; });

        var result = await _service.CreateAsync(_userId, request);

        result.RecurringId.Should().Be(10);
        result.Title.Should().Be("Subscription");
        _recurringRepoMock.Verify(r => r.CreateAsync(It.Is<RecurringJournal>(rj =>
            rj.UserId == _userId &&
            rj.Title == "Subscription" &&
            rj.Frequency == "monthly"
        )), Times.Once);
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnRecurring_UpdatesFields()
    {
        var existing = MakeRecurring(1);
        _recurringRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _recurringRepoMock.Setup(r => r.UpdateAsync(It.IsAny<RecurringJournal>()))
            .ReturnsAsync((RecurringJournal r) => r);

        var request = new UpdateRecurringDto { Title = "Updated", Amount = 999m };

        var result = await _service.UpdateAsync(_userId, 1, request);

        result.Title.Should().Be("Updated");
        result.Amount.Should().Be(999m);
    }

    [Fact]
    public async Task UpdateAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeRecurring(1, userId: 99);
        _recurringRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateRecurringDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnRecurring_DeletesAndReturnsTrue()
    {
        var existing = MakeRecurring(1);
        _recurringRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _recurringRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
        _recurringRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsKeyNotFound()
    {
        _recurringRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((RecurringJournal?)null);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── ProcessDueRecurringsAsync ──────────────────────────────────────────

    [Fact]
    public async Task ProcessDueRecurringsAsync_ProcessesDueEntries()
    {
        var due = new[] { MakeRecurring(1, title: "Due Rent") };
        _recurringRepoMock.Setup(r => r.GetDueAsync(It.IsAny<DateTime>())).ReturnsAsync(due);
        _transactionServiceMock
            .Setup(t => t.CreateAsync(It.IsAny<int>(), It.IsAny<CreateTransactionDto>()))
            .ReturnsAsync(new TransactionDto { JournalId = 100 });
        _recurringRepoMock
            .Setup(r => r.AddInstanceAsync(It.IsAny<RecurringInstance>()))
            .ReturnsAsync((RecurringInstance i) => i);
        _recurringRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<RecurringJournal>()))
            .ReturnsAsync((RecurringJournal r) => r);

        await _service.ProcessDueRecurringsAsync();

        _transactionServiceMock.Verify(t => t.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d => d.Amount == 5000m)), Times.Once);
        _recurringRepoMock.Verify(r => r.AddInstanceAsync(
            It.Is<RecurringInstance>(i => i.Status == "completed")), Times.Once);
    }

    [Fact]
    public async Task ProcessDueRecurringsAsync_HandlesFailureGracefully()
    {
        var due = new[] { MakeRecurring(1, title: "Fail Rent") };
        _recurringRepoMock.Setup(r => r.GetDueAsync(It.IsAny<DateTime>())).ReturnsAsync(due);
        _transactionServiceMock
            .Setup(t => t.CreateAsync(It.IsAny<int>(), It.IsAny<CreateTransactionDto>()))
            .ThrowsAsync(new Exception("DB error"));
        _recurringRepoMock
            .Setup(r => r.AddInstanceAsync(It.IsAny<RecurringInstance>()))
            .ReturnsAsync((RecurringInstance i) => i);

        await _service.ProcessDueRecurringsAsync();

        // Should record a "skipped" instance despite the error
        _recurringRepoMock.Verify(r => r.AddInstanceAsync(
            It.Is<RecurringInstance>(i => i.Status == "skipped")), Times.Once);
        // Should NOT update NextRunDate on failure
        _recurringRepoMock.Verify(r => r.UpdateAsync(It.IsAny<RecurringJournal>()), Times.Never);
    }

    [Fact]
    public async Task ProcessDueRecurringsAsync_NoDueEntries_DoesNothing()
    {
        _recurringRepoMock.Setup(r => r.GetDueAsync(It.IsAny<DateTime>()))
            .ReturnsAsync(Array.Empty<RecurringJournal>());

        await _service.ProcessDueRecurringsAsync();

        _transactionServiceMock.Verify(t => t.CreateAsync(It.IsAny<int>(),
            It.IsAny<CreateTransactionDto>()), Times.Never);
        _recurringRepoMock.Verify(r => r.AddInstanceAsync(
            It.IsAny<RecurringInstance>()), Times.Never);
    }
}
