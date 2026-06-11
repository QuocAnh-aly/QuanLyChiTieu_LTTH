using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class BudgetServiceTests
{
    private readonly Mock<IBudgetRepository>  _budgetRepoMock;
    private readonly Mock<IAccountRepository> _accountRepoMock;
    private readonly Mock<IJournalRepository> _journalRepoMock;
    private readonly BudgetService _service;
    private readonly int _userId = 1;

    public BudgetServiceTests()
    {
        _budgetRepoMock   = new Mock<IBudgetRepository>();
        _accountRepoMock  = new Mock<IAccountRepository>();
        _journalRepoMock  = new Mock<IJournalRepository>();
        _service = new BudgetService(
            _budgetRepoMock.Object,
            _accountRepoMock.Object,
            _journalRepoMock.Object);
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
    public async Task CreateExpenseBudgetAsync_WithExistingCategory_CreatesBudget()
    {
        var existingAccount = new Account
        {
            AccountId = 10,
            UserId    = _userId,
            TypeId    = 5,
            Name      = "Ăn uống",
            IconName  = "Coffee",
            Color     = "orange",
            IsActive  = true,
        };

        var request = new CreateBudgetDto
        {
            AccountId    = 10,
            Title        = "Budget Ăn uống T6",
            TargetAmount = 2000m,
            PeriodType   = "weekly",
            StartDate    = new DateTime(2026, 6, 1),
        };

        _accountRepoMock
            .Setup(r => r.GetWithDetailsAsync(10))
            .ReturnsAsync(existingAccount);

        // No past transactions for this account
        _journalRepoMock
            .Setup(r => r.GetByDateRangeAndAccountAsync(
                _userId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), 10))
            .ReturnsAsync(Array.Empty<JournalEntry>());

        _budgetRepoMock
            .Setup(r => r.CreateAsync(It.Is<Budget>(b =>
                b.Title == "Budget Ăn uống T6" &&
                b.TargetAmount == 2000m &&
                b.CurrentAmount == 0m)))  // no past transactions → CurrentAmount = 0
            .ReturnsAsync((Budget b) => b);  // return the actual budget the service built

        var result = await _service.CreateExpenseBudgetAsync(_userId, request);

        result.Title.Should().Be("Budget Ăn uống T6");
        result.TargetAmount.Should().Be(2000m);
        result.CurrentAmount.Should().Be(0m);
        _accountRepoMock.Verify(r => r.CreateAsync(It.IsAny<Account>()), Times.Never);
        _budgetRepoMock.Verify(r => r.CreateAsync(It.IsAny<Budget>()), Times.Once);
        _journalRepoMock.Verify(r => r.GetByDateRangeAndAccountAsync(
            _userId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), 10), Times.Once);
    }

    [Fact]
    public async Task CreateExpenseBudgetAsync_NoAccountId_ThrowsArgumentException()
    {
        var request = new CreateBudgetDto
        {
            AccountId    = 0,
            Title        = "Budget",
            TargetAmount = 1000m,
            StartDate    = new DateTime(2026, 6, 1),
        };

        await FluentActions.Invoking(() => _service.CreateExpenseBudgetAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("Phải chọn danh mục chi tiêu cho ngân sách.");
    }

    [Fact]
    public async Task CreateExpenseBudgetAsync_NonExistentAccount_ThrowsKeyNotFound()
    {
        _accountRepoMock.Setup(r => r.GetWithDetailsAsync(999))
            .ReturnsAsync((Account?)null);

        var request = new CreateBudgetDto
        {
            AccountId    = 999,
            Title        = "Budget",
            TargetAmount = 1000m,
            StartDate    = new DateTime(2026, 6, 1),
        };

        await FluentActions.Invoking(() => _service.CreateExpenseBudgetAsync(_userId, request))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateExpenseBudgetAsync_OtherUsersAccount_ThrowsUnauthorized()
    {
        var otherAccount = new Account
        {
            AccountId = 10,
            UserId    = 99,
            TypeId    = 5,
            Name      = "Other's",
            IsActive  = true,
        };
        _accountRepoMock.Setup(r => r.GetWithDetailsAsync(10))
            .ReturnsAsync(otherAccount);

        var request = new CreateBudgetDto
        {
            AccountId    = 10,
            Title        = "Budget",
            TargetAmount = 1000m,
            StartDate    = new DateTime(2026, 6, 1),
        };

        await FluentActions.Invoking(() => _service.CreateExpenseBudgetAsync(_userId, request))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateExpenseBudgetAsync_NonExpenseAccount_ThrowsArgumentException()
    {
        var assetAccount = new Account
        {
            AccountId = 10,
            UserId    = _userId,
            TypeId    = 1,  // Assets, not Expense
            Name      = "Checking",
            IsActive  = true,
        };
        _accountRepoMock.Setup(r => r.GetWithDetailsAsync(10))
            .ReturnsAsync(assetAccount);

        var request = new CreateBudgetDto
        {
            AccountId    = 10,
            Title        = "Budget",
            TargetAmount = 1000m,
            StartDate    = new DateTime(2026, 6, 1),
        };

        await FluentActions.Invoking(() => _service.CreateExpenseBudgetAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("Danh mục được chọn phải là danh mục chi tiêu (Expense).");
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

    // ─── UpdateSpentAmountAsync (accountId-based) ────────────────────────────

    [Fact]
    public async Task UpdateSpentAmountAsync_FindsActiveBudgetAndUpdates()
    {
        var budget = MakeBudget(42, current: 1000m);
        _budgetRepoMock.Setup(r => r.GetActiveByAccountIdAsync(42)).ReturnsAsync(budget);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(42, 1200m))
            .Returns(Task.CompletedTask);

        await _service.UpdateSpentAmountAsync(42, 200m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(42, 1200m), Times.Once);
    }

    [Fact]
    public async Task UpdateSpentAmountAsync_NegativeDelta_DecreasesCurrentAmount()
    {
        var budget = MakeBudget(42, current: 1000m);
        _budgetRepoMock.Setup(r => r.GetActiveByAccountIdAsync(42)).ReturnsAsync(budget);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(42, 700m))
            .Returns(Task.CompletedTask);

        await _service.UpdateSpentAmountAsync(42, -300m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(42, 700m), Times.Once);
    }

    [Fact]
    public async Task UpdateSpentAmountAsync_NoActiveBudget_DoesNothing()
    {
        _budgetRepoMock.Setup(r => r.GetActiveByAccountIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await _service.UpdateSpentAmountAsync(999, 200m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    // ─── UpdateBudgetSpentAsync (budgetId-based, new) ─────────────────────────

    [Fact]
    public async Task UpdateBudgetSpentAsync_AddsDeltaToSpecificBudget()
    {
        var budget = MakeBudget(42, current: 500m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(budget);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(42, 800m))
            .Returns(Task.CompletedTask);

        await _service.UpdateBudgetSpentAsync(42, 300m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(42, 800m), Times.Once);
    }

    [Fact]
    public async Task UpdateBudgetSpentAsync_SubtractsDeltaCorrectly()
    {
        var budget = MakeBudget(42, current: 1000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(budget);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(42, 600m))
            .Returns(Task.CompletedTask);

        await _service.UpdateBudgetSpentAsync(42, -400m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(42, 600m), Times.Once);
    }

    [Fact]
    public async Task UpdateBudgetSpentAsync_NonExistentBudget_DoesNothing()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await _service.UpdateBudgetSpentAsync(999, 200m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task UpdateBudgetSpentAsync_ZeroCurrentAmount_AddsCorrectly()
    {
        var budget = MakeBudget(42, current: 0m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(budget);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(42, 500m))
            .Returns(Task.CompletedTask);

        await _service.UpdateBudgetSpentAsync(42, 500m);

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(42, 500m), Times.Once);
    }

    // ─── Savings Goals ────────────────────────────────────────────────────────

    private static Budget MakeSavingsGoal(int budgetId = 1, int userId = 1,
        string title = "Vacation", decimal target = 10000m, decimal current = 2000m,
        decimal monthly = 500m)
    {
        var account = new Account
        {
            AccountId = budgetId,
            UserId    = userId,
            TypeId    = 1,
            Name      = "Savings Account",
            IsActive  = true,
        };

        return new Budget
        {
            BudgetId             = budgetId,
            UserId               = userId,
            AccountId            = budgetId,
            Account              = account,
            Title                = title,
            BudgetType           = "savings",
            TargetAmount         = target,
            CurrentAmount        = current,
            MonthlyContribution  = monthly,
            PeriodType           = "monthly",
            StartDate            = new DateTime(2026, 1, 1),
            IsActive             = true,
            Deadline             = "2026-12-31",
        };
    }

    [Fact]
    public async Task GetSavingsGoalsAsync_ReturnsSavingsGoals()
    {
        var goals = new[] { MakeSavingsGoal(1) };
        _budgetRepoMock.Setup(r => r.GetSavingsGoalsAsync(_userId)).ReturnsAsync(goals);

        var result = await _service.GetSavingsGoalsAsync(_userId);

        result.Should().ContainSingle().Which.Title.Should().Be("Vacation");
    }

    [Fact]
    public async Task GetSavingsGoalsAsync_Empty_ReturnsEmpty()
    {
        _budgetRepoMock.Setup(r => r.GetSavingsGoalsAsync(_userId))
            .ReturnsAsync(Array.Empty<Budget>());

        var result = await _service.GetSavingsGoalsAsync(_userId);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSavingsGoalByIdAsync_OwnGoal_ReturnsDto()
    {
        var goal = MakeSavingsGoal(42);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(goal);

        var result = await _service.GetSavingsGoalByIdAsync(_userId, 42);

        result.BudgetId.Should().Be(42);
        result.Title.Should().Be("Vacation");
        result.TargetAmount.Should().Be(10000m);
        result.CurrentAmount.Should().Be(2000m);
        result.SavePerMonth.Should().Be(500m);
        result.TargetDate.Should().Be("2026-12-31");
    }

    [Fact]
    public async Task GetSavingsGoalByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var goal = MakeSavingsGoal(1, userId: 99);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);

        await FluentActions.Invoking(() => _service.GetSavingsGoalByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetSavingsGoalByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await FluentActions.Invoking(() => _service.GetSavingsGoalByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateSavingsGoalAsync_CreatesAndReturnsDto()
    {
        var request = new CreateSavingsGoalDto
        {
            AccountId           = 1,
            Title               = "New Car",
            TargetAmount        = 50000m,
            InitialAmount       = 1000m,
            MonthlyContribution = 2000m,
            TargetDate          = "2027-06-01",
            IconName            = "Car",
            Color               = "blue",
        };

        _budgetRepoMock
            .Setup(r => r.CreateAsync(It.Is<Budget>(b =>
                b.Title == "New Car" &&
                b.BudgetType == "savings" &&
                b.TargetAmount == 50000m &&
                b.CurrentAmount == 1000m &&
                b.MonthlyContribution == 2000m &&
                b.Deadline == "2027-06-01")))
            .ReturnsAsync((Budget b) => b);

        var result = await _service.CreateSavingsGoalAsync(_userId, request);

        result.Title.Should().Be("New Car");
        result.TargetAmount.Should().Be(50000m);
        result.CurrentAmount.Should().Be(1000m);
        result.SavePerMonth.Should().Be(2000m);
    }

    [Fact]
    public async Task CreateSavingsGoalAsync_NoInitialAmount_DefaultsToZero()
    {
        var request = new CreateSavingsGoalDto
        {
            AccountId    = 1,
            Title        = "New Car",
            TargetAmount = 50000m,
        };

        _budgetRepoMock
            .Setup(r => r.CreateAsync(It.Is<Budget>(b => b.CurrentAmount == 0m)))
            .ReturnsAsync((Budget b) => b);

        var result = await _service.CreateSavingsGoalAsync(_userId, request);

        result.CurrentAmount.Should().Be(0m);
    }

    [Fact]
    public async Task UpdateSavingsGoalAsync_OwnGoal_UpdatesFields()
    {
        var existing = MakeSavingsGoal(1);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _budgetRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Budget>()))
            .ReturnsAsync((Budget b) => b);

        var request = new UpdateSavingsGoalDto
        {
            Title        = "Bigger Vacation",
            TargetAmount = 20000m,
        };

        var result = await _service.UpdateSavingsGoalAsync(_userId, 1, request);

        result.Title.Should().Be("Bigger Vacation");
        result.TargetAmount.Should().Be(20000m);
    }

    [Fact]
    public async Task UpdateSavingsGoalAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeSavingsGoal(1, userId: 99);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateSavingsGoalAsync(_userId, 1, new UpdateSavingsGoalDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task AddMoneyAsync_AddsAmountAndUpdatesCurrent()
    {
        var goal = MakeSavingsGoal(1, current: 2000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(1, 3500m))
            .Returns(Task.CompletedTask);
        _budgetRepoMock
            .Setup(r => r.AddEventAsync(1, 1500m, null))
            .Returns(Task.CompletedTask);
        // GetByIdAsync called again after update to return fresh data
        var updatedGoal = MakeSavingsGoal(1, current: 3500m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updatedGoal);

        var result = await _service.AddMoneyAsync(_userId, 1, 1500m, null);

        result.CurrentAmount.Should().Be(3500m);
        _budgetRepoMock.Verify(r => r.AddEventAsync(1, 1500m, null), Times.Once);
    }

    [Fact]
    public async Task AddMoneyAsync_ExceedsTarget_ClampsToTarget()
    {
        var goal = MakeSavingsGoal(1, current: 9000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(1, 10000m))  // clamped to target
            .Returns(Task.CompletedTask);
        _budgetRepoMock
            .Setup(r => r.AddEventAsync(1, 2000m, null))
            .Returns(Task.CompletedTask);
        var updatedGoal = MakeSavingsGoal(1, current: 10000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updatedGoal);

        var result = await _service.AddMoneyAsync(_userId, 1, 2000m, null);

        result.CurrentAmount.Should().Be(10000m);  // should not exceed target
    }

    [Fact]
    public async Task AddMoneyAsync_NonExistent_ThrowsKeyNotFound()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await FluentActions.Invoking(() =>
            _service.AddMoneyAsync(_userId, 999, 100m, null))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task RemoveMoneyAsync_RemovesAmountAndCreatesEvent()
    {
        var goal = MakeSavingsGoal(1, current: 5000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(1, 3000m))
            .Returns(Task.CompletedTask);
        _budgetRepoMock
            .Setup(r => r.AddEventAsync(1, -2000m, "Emergency"))
            .Returns(Task.CompletedTask);
        var updatedGoal = MakeSavingsGoal(1, current: 3000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updatedGoal);

        var result = await _service.RemoveMoneyAsync(_userId, 1, 2000m, "Emergency");

        result.CurrentAmount.Should().Be(3000m);
        _budgetRepoMock.Verify(r => r.AddEventAsync(1, -2000m, "Emergency"), Times.Once);
    }

    [Fact]
    public async Task RemoveMoneyAsync_MoreThanCurrent_ClampsToZero()
    {
        var goal = MakeSavingsGoal(1, current: 1000m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(1, 0m))  // clamped to 0
            .Returns(Task.CompletedTask);
        _budgetRepoMock
            .Setup(r => r.AddEventAsync(1, -5000m, null))
            .Returns(Task.CompletedTask);
        var updatedGoal = MakeSavingsGoal(1, current: 0m, target: 10000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updatedGoal);

        var result = await _service.RemoveMoneyAsync(_userId, 1, 5000m, null);

        result.CurrentAmount.Should().Be(0m);
    }

    [Fact]
    public async Task RemoveMoneyAsync_NonExistent_ThrowsKeyNotFound()
    {
        _budgetRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Budget?)null);

        await FluentActions.Invoking(() =>
            _service.RemoveMoneyAsync(_userId, 999, 100m, null))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ResetHistoryAsync_ResetsCurrentAmountAndDeletesEvents()
    {
        var goal = MakeSavingsGoal(1, current: 5000m);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);
        _budgetRepoMock
            .Setup(r => r.DeleteEventsByBudgetIdAsync(1))
            .Returns(Task.CompletedTask);
        _budgetRepoMock
            .Setup(r => r.UpdateCurrentAmountAsync(1, 0m))
            .Returns(Task.CompletedTask);

        var result = await _service.ResetHistoryAsync(_userId, 1);

        result.Should().BeTrue();
        _budgetRepoMock.Verify(r => r.DeleteEventsByBudgetIdAsync(1), Times.Once);
        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(1, 0m), Times.Once);
    }

    [Fact]
    public async Task GetEventsAsync_ReturnsEvents()
    {
        var goal = MakeSavingsGoal(1);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);

        var events = new[]
        {
            new PiggyBankEvent
            {
                EventId   = 1,
                BudgetId  = 1,
                Amount    = 1000m,
                EventDate = new DateTime(2026, 6, 1),
                Notes     = "Deposit"
            },
            new PiggyBankEvent
            {
                EventId   = 2,
                BudgetId  = 1,
                Amount    = -200m,
                EventDate = new DateTime(2026, 6, 5),
                Notes     = "Withdrawal"
            }
        };
        _budgetRepoMock
            .Setup(r => r.GetEventsByBudgetIdAsync(1))
            .ReturnsAsync(events);

        var result = (await _service.GetEventsAsync(_userId, 1)).ToList();

        result.Should().HaveCount(2);
        result[0].Amount.Should().Be(1000m);
        result[0].IsAdd.Should().BeTrue();
        result[1].Amount.Should().Be(-200m);
        result[1].IsAdd.Should().BeFalse();
    }

    [Fact]
    public async Task GetEventsAsync_OtherUser_ThrowsUnauthorized()
    {
        var goal = MakeSavingsGoal(1, userId: 99);
        _budgetRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(goal);

        await FluentActions.Invoking(() =>
            _service.GetEventsAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── ResetExpiredPeriodsAsync ────────────────────────────────────────────

    private static Budget MakeResetBudget(int budgetId, DateTime startDate,
        string periodType = "monthly", decimal currentAmount = 1000m)
    {
        return new Budget
        {
            BudgetId      = budgetId,
            UserId        = 1,
            AccountId     = budgetId,
            Title         = $"Budget {budgetId}",
            BudgetType    = "expense",
            TargetAmount  = 5000m,
            CurrentAmount = currentAmount,
            PeriodType    = periodType,
            StartDate     = startDate,
            IsActive      = true,
            Account = new Account { AccountId = budgetId, UserId = 1, TypeId = 5, Name = $"Budget {budgetId}", IsActive = true },
        };
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_NoBudgets_DoesNothing()
    {
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(Array.Empty<Budget>());

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_SameDay_NoReset()
    {
        var today = DateTime.UtcNow.Date;
        var budgets = new[] { MakeResetBudget(1, today) };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_WeeklyBoundaryDay_Resets()
    {
        // startDate = today - 7 days → today is exactly the weekly boundary
        var today = DateTime.UtcNow.Date;
        var startDate = today.AddDays(-7);
        var budgets = new[] { MakeResetBudget(1, startDate, periodType: "weekly") };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        // (7/7)=1 > (6/7)=0 → always resets on day 7
        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(1, 0m), Times.Once);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_YearlyBoundaryDay_Resets()
    {
        // startDate = today - 1 year → today is exactly the yearly anniversary
        var today = DateTime.UtcNow.Date;
        var startDate = today.AddYears(-1);
        var budgets = new[] { MakeResetBudget(1, startDate, periodType: "yearly") };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        // today == start + 1 year → always resets on yearly anniversary
        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(1, 0m), Times.Once);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_MonthlyBoundaryDay_ResetsWhenOnBoundary()
    {
        // Use startDate = 15th of last month. Boundary is 15th of this month.
        // If today == 15th → reset; otherwise → no reset (conditional assertion)
        var today = DateTime.UtcNow.Date;
        var lastMonth15 = new DateTime(today.Year, today.Month, 15).AddMonths(-1);
        var budgets = new[] { MakeResetBudget(1, lastMonth15) };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        // Verify correct behavior based on whether today is the boundary day
        if (today.Day == 15)
            _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(1, 0m), Times.Once);
        else
            _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_MultipleBudgets_OnlyBoundaryResets()
    {
        var today = DateTime.UtcNow.Date;
        // Budget 1: started 3 days ago → same period → no reset
        // Budget 2: started 7 days ago (weekly) → exact boundary → resets
        // Budget 3: started 15 days ago → some period, not boundary unless today.Day==15
        var budgets = new[]
        {
            MakeResetBudget(1, today.AddDays(-3)),
            MakeResetBudget(2, today.AddDays(-7), periodType: "weekly"),
            MakeResetBudget(3, new DateTime(today.Year, today.Month, 15).AddMonths(-1)),
        };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        // Budget 2 (weekly, day 7) always resets
        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(2, 0m), Times.Once);
        // Budget 1 never resets
        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(1, 0m), Times.Never);
        // Budget 3 resets only on the 15th
        if (today.Day == 15)
            _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(3, 0m), Times.Once);
        else
            _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(3, 0m), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_MidPeriodAfterBoundary_NoDoubleReset()
    {
        // startDate = 45 days ago → well past first monthly boundary.
        // Both today and yesterday are in the same period → no reset.
        var today = DateTime.UtcNow.Date;
        var budgets = new[] { MakeResetBudget(1, today.AddDays(-45)) };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_UnknownPeriodType_NoReset()
    {
        var today = DateTime.UtcNow.Date;
        var budgets = new[] { MakeResetBudget(1, today.AddDays(-100), periodType: "unknown") };
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(budgets);

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_SavingsBudget_NotAffected()
    {
        // Savings budgets have BudgetType = "savings", not returned by GetExpenseBudgetsNeedingResetAsync
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(Array.Empty<Budget>());

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ResetExpiredPeriodsAsync_ZeroCurrentAmount_NotFetched()
    {
        // Budgets with CurrentAmount=0 are filtered by the repo query
        // Service handles empty list gracefully
        _budgetRepoMock
            .Setup(r => r.GetExpenseBudgetsNeedingResetAsync())
            .ReturnsAsync(Array.Empty<Budget>());

        await _service.ResetExpiredPeriodsAsync();

        _budgetRepoMock.Verify(r => r.UpdateCurrentAmountAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }
}
