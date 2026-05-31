using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class BudgetServiceTests
{
    private readonly Mock<IBudgetRepository> _budgetRepoMock;
    private readonly Mock<IAccountRepository> _accountRepoMock;
    private readonly BudgetService _service;
    private readonly int _userId = 1;

    public BudgetServiceTests()
    {
        _budgetRepoMock  = new Mock<IBudgetRepository>();
        _accountRepoMock = new Mock<IAccountRepository>();
        _service = new BudgetService(_budgetRepoMock.Object, _accountRepoMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Budget MakeBudget(int budgetId = 1, int userId = 1,
        string title = "Groceries", decimal target = 5000m, decimal current = 1000m)
    {
        var account = new Account
        {
            AccountId = budgetId,
            UserId    = userId,
            TypeId    = 5,
            Name      = title,
            IsActive  = true,
        };

        return new Budget
        {
            BudgetId      = budgetId,
            UserId        = userId,
            AccountId     = budgetId,
            Account       = account,
            Title         = title,
            BudgetType    = "expense",
            TargetAmount  = target,
            CurrentAmount = current,
            PeriodType    = "monthly",
            StartDate     = new DateTime(2026, 1, 1),
            IsActive      = true,
        };
    }

    // ─── GetExpenseBudgetsAsync (non-paged) ────────────────────────────────

    [Fact]
    public async Task GetExpenseBudgetsAsync_ReturnsAllExpenseBudgets()
    {
        var budgets = new[] { MakeBudget(1), MakeBudget(2, title: "Transport") };
        _budgetRepoMock.Setup(r => r.GetExpenseBudgetsAsync(_userId)).ReturnsAsync(budgets);

        var result = await _service.GetExpenseBudgetsAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Title.Should().Be("Groceries");
    }

    [Fact]
    public async Task GetExpenseBudgetsAsync_Empty_ReturnsEmpty()
    {
        _budgetRepoMock.Setup(r => r.GetExpenseBudgetsAsync(_userId))
            .ReturnsAsync(Array.Empty<Budget>());

        var result = await _service.GetExpenseBudgetsAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetExpenseBudgetsPagedAsync ────────────────────────────────────────

    [Fact]
    public async Task GetExpenseBudgetsPagedAsync_ReturnsPagedResult()
    {
        var budgets = new[] { MakeBudget(1), MakeBudget(2) };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsPagedAsync(_userId, 1, 10))
            .ReturnsAsync(new PaginatedResult<Budget>
            {
                Items = budgets.ToList(),
                TotalCount = 2,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetExpenseBudgetsPagedAsync(_userId, 1, 10);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(10);
        result.TotalPages.Should().Be(1);
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetExpenseBudgetsPagedAsync_SecondPage_ReturnsCorrectPage()
    {
        var allBudgets = Enumerable.Range(1, 5).Select(i =>
            MakeBudget(i, title: $"Budget {i}")
        ).ToList();

        var page2Items = allBudgets.Skip(3).Take(2).ToList();

        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsPagedAsync(_userId, 2, 3))
            .ReturnsAsync(new PaginatedResult<Budget>
            {
                Items = page2Items,
                TotalCount = 5,
                Page = 2,
                PageSize = 3,
            });

        var result = await _service.GetExpenseBudgetsPagedAsync(_userId, 2, 3);

        result.Items.Should().HaveCount(2);
        result.Items.First().Title.Should().Be("Budget 4");
        result.TotalPages.Should().Be(2);
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetExpenseBudgetsPagedAsync_EmptyPage_ReturnsEmpty()
    {
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsPagedAsync(_userId, 99, 10))
            .ReturnsAsync(new PaginatedResult<Budget>
            {
                Items = new List<Budget>(),
                TotalCount = 5,
                Page = 99,
                PageSize = 10,
            });

        var result = await _service.GetExpenseBudgetsPagedAsync(_userId, 99, 10);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(5);
    }

    // ─── GetExpenseBudgetByIdAsync ──────────────────────────────────────────

    [Fact]
    public async Task GetExpenseBudgetByIdAsync_OwnBudget_ReturnsDto()
    {
        var budget = MakeBudget(42);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(budget);

        var result = await _service.GetExpenseBudgetByIdAsync(_userId, 42);

        result.Should().NotBeNull();
        result.BudgetId.Should().Be(42);
        result.Title.Should().Be("Groceries");
    }

    [Fact]
    public async Task GetExpenseBudgetByIdAsync_OtherUsersBudget_ThrowsUnauthorized()
    {
        var budget = MakeBudget(1, userId: 99);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(budget);

        await FluentActions.Invoking(() => _service.GetExpenseBudgetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetExpenseBudgetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await FluentActions.Invoking(() => _service.GetExpenseBudgetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateExpenseBudgetAsync ──────────────────────────────────────────

    [Fact]
    public async Task CreateExpenseBudgetAsync_CreatesAccountAndBudget()
    {
        var request = new CreateBudgetDto
        {
            Title        = "New Budget",
            TargetAmount = 2000m,
            PeriodType   = "weekly",
            StartDate    = new DateTime(2026, 6, 1),
        };

        _accountRepoMock
            .Setup(r => r.CreateAsync(It.Is<Account>(a => a.Name == "New Budget" && a.TypeId == 5)))
            .ReturnsAsync(new Account { AccountId = 10, UserId = _userId, TypeId = 5, Name = "New Budget" });

        _budgetRepoMock
            .Setup(r => r.CreateAsync(It.Is<Budget>(b => b.Title == "New Budget" && b.TargetAmount == 2000m)))
            .ReturnsAsync(MakeBudget(1, title: "New Budget", target: 2000m));

        var result = await _service.CreateExpenseBudgetAsync(_userId, request);

        result.Title.Should().Be("New Budget");
        result.TargetAmount.Should().Be(2000m);
        _accountRepoMock.Verify(r => r.CreateAsync(It.IsAny<Account>()), Times.Once);
        _budgetRepoMock.Verify(r => r.CreateAsync(It.IsAny<Budget>()), Times.Once);
    }

    // ─── UpdateExpenseBudgetAsync ──────────────────────────────────────────

    [Fact]
    public async Task UpdateExpenseBudgetAsync_OwnBudget_UpdatesFields()
    {
        var existing = MakeBudget(1);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _budgetRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Budget>()))
            .ReturnsAsync((Budget b) => b);

        var request = new UpdateBudgetDto
        {
            Title        = "Updated",
            TargetAmount = 9999m,
        };

        var result = await _service.UpdateExpenseBudgetAsync(_userId, 1, request);

        result.Title.Should().Be("Updated");
        result.TargetAmount.Should().Be(9999m);
    }

    [Fact]
    public async Task UpdateExpenseBudgetAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeBudget(1, userId: 99);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateExpenseBudgetAsync(_userId, 1, new UpdateBudgetDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteBudgetAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task DeleteBudgetAsync_OwnBudget_DeletesAndReturnsTrue()
    {
        var existing = MakeBudget(1);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _budgetRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteBudgetAsync(_userId, 1);

        result.Should().BeTrue();
        _budgetRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteBudgetAsync_NonExistent_ThrowsKeyNotFound()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await FluentActions.Invoking(() => _service.DeleteBudgetAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── GetSavingsGoalsAsync ──────────────────────────────────────────────

    [Fact]
    public async Task GetSavingsGoalsAsync_ReturnsSavingsGoals()
    {
        var goals = new[] { MakeBudget(1, title: "Vacation", target: 10000m) };
        goals[0].BudgetType = "savings";
        _budgetRepoMock.Setup(r => r.GetSavingsGoalsAsync(_userId)).ReturnsAsync(goals);

        var result = await _service.GetSavingsGoalsAsync(_userId);

        result.Should().ContainSingle().Which.Title.Should().Be("Vacation");
    }
}
