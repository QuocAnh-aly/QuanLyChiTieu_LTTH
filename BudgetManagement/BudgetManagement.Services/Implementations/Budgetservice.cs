using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class BudgetService : IBudgetService
{
    private readonly IBudgetRepository  _budgetRepo;
    private readonly IAccountRepository _accountRepo;

    public BudgetService(IBudgetRepository budgetRepo, IAccountRepository accountRepo)
    {
        _budgetRepo  = budgetRepo;
        _accountRepo = accountRepo;
    }

    // ─── Expense Budgets (Budget.jsx) ───────────────────────────────────────

    public async Task<IEnumerable<BudgetDto>> GetExpenseBudgetsAsync(int userId)
    {
        var budgets = await _budgetRepo.GetExpenseBudgetsAsync(userId);
        return budgets.Select(MapToBudgetDto);
    }

    public async Task<PaginatedResult<BudgetDto>> GetExpenseBudgetsPagedAsync(int userId, int page, int pageSize)
    {
        var result = await _budgetRepo.GetExpenseBudgetsPagedAsync(userId, page, pageSize);
        return new PaginatedResult<BudgetDto>
        {
            Items = result.Items.Select(MapToBudgetDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<BudgetDto> GetExpenseBudgetByIdAsync(int userId, int budgetId)
    {
        var budget = await _budgetRepo.GetByIdAsync(budgetId)
                     ?? throw new KeyNotFoundException("Budget not found.");

        if (budget.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return MapToBudgetDto(budget);
    }

    public async Task<BudgetDto> CreateExpenseBudgetAsync(int userId, CreateBudgetDto request)
    {
        // Tự động tạo Expense account (typeId=5) gắn với budget này
        var expenseAccount = await _accountRepo.CreateAsync(new Account
        {
            UserId    = userId,
            TypeId    = 5,
            Name      = request.Title,
            IconName  = request.IconName ?? "Coffee",
            Color     = request.Color    ?? "orange",
            Balance   = 0,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
        });

        var budget = new Budget
        {
            UserId              = userId,
            AccountId           = expenseAccount.AccountId,
            Title               = request.Title,
            BudgetType          = "expense",
            TargetAmount        = request.TargetAmount,
            CurrentAmount       = 0,
            PeriodType          = request.PeriodType ?? "monthly",
            StartDate           = request.StartDate,
            EndDate             = request.EndDate,
            IconName            = request.IconName ?? "Coffee",
            Color               = request.Color    ?? "orange",
            IsActive            = true,
            CreatedAt           = DateTime.UtcNow
        };

        var created = await _budgetRepo.CreateAsync(budget);
        return MapToBudgetDto(created);
    }

    public async Task<BudgetDto> UpdateExpenseBudgetAsync(int userId, int budgetId, UpdateBudgetDto request)
    {
        var budget = await _budgetRepo.GetByIdAsync(budgetId)
                     ?? throw new KeyNotFoundException("Budget not found.");

        if (budget.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        budget.Title        = request.Title        ?? budget.Title;
        budget.TargetAmount = request.TargetAmount ?? budget.TargetAmount;
        budget.PeriodType   = request.PeriodType   ?? budget.PeriodType;
        budget.StartDate    = request.StartDate    ?? budget.StartDate;
        budget.EndDate      = request.EndDate      ?? budget.EndDate;
        budget.IconName     = request.IconName     ?? budget.IconName;
        budget.Color        = request.Color        ?? budget.Color;
        budget.IsActive     = request.IsActive     ?? budget.IsActive;

        var updated = await _budgetRepo.UpdateAsync(budget);
        return MapToBudgetDto(updated);
    }

    public async Task<bool> DeleteBudgetAsync(int userId, int budgetId)
    {
        var budget = await _budgetRepo.GetByIdAsync(budgetId)
                     ?? throw new KeyNotFoundException("Budget not found.");

        if (budget.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return await _budgetRepo.DeleteAsync(budgetId);
    }

    // ─── Savings Goals (Savings.jsx) ────────────────────────────────────────

    public async Task<IEnumerable<SavingsGoalDto>> GetSavingsGoalsAsync(int userId)
    {
        var goals = await _budgetRepo.GetSavingsGoalsAsync(userId);
        return goals.Select(MapToSavingsDto);
    }

    public async Task<SavingsGoalDto> GetSavingsGoalByIdAsync(int userId, int budgetId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");

        if (goal.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return MapToSavingsDto(goal);
    }

    public async Task<SavingsGoalDto> CreateSavingsGoalAsync(int userId, CreateSavingsGoalDto request)
    {
        var goal = new Budget
        {
            UserId               = userId,
            AccountId            = request.AccountId,
            Title                = request.Title,
            BudgetType           = "savings",
            TargetAmount         = request.TargetAmount,
            CurrentAmount        = request.InitialAmount ?? 0,
            MonthlyContribution  = request.MonthlyContribution ?? 0,
            PeriodType           = "monthly",
            StartDate            = DateTime.UtcNow,
            Deadline             = request.TargetDate,
            IconName             = request.IconName ?? "PiggyBank",
            Color                = request.Color    ?? "green",
            IsActive             = true,
            CreatedAt            = DateTime.UtcNow
        };

        var created = await _budgetRepo.CreateAsync(goal);
        return MapToSavingsDto(created);
    }

    public async Task<SavingsGoalDto> UpdateSavingsGoalAsync(int userId, int budgetId, UpdateSavingsGoalDto request)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");

        if (goal.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        goal.Title               = request.Title               ?? goal.Title;
        goal.TargetAmount        = request.TargetAmount        ?? goal.TargetAmount;
        goal.MonthlyContribution = request.MonthlyContribution ?? goal.MonthlyContribution;
        goal.Deadline            = request.TargetDate          ?? goal.Deadline;
        goal.IconName            = request.IconName            ?? goal.IconName;
        goal.Color               = request.Color               ?? goal.Color;
        goal.IsActive            = request.IsActive            ?? goal.IsActive;

        var updated = await _budgetRepo.UpdateAsync(goal);
        return MapToSavingsDto(updated);
    }

    public async Task<SavingsGoalDto> AddMoneyAsync(int userId, int budgetId, decimal amount, string? notes)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");

        var newAmount = (goal.CurrentAmount ?? 0) + amount;
        if (newAmount > goal.TargetAmount) newAmount = goal.TargetAmount;   // clamp to target

        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount);
        await _budgetRepo.AddEventAsync(budgetId, amount, notes);

        return MapToSavingsDto((await _budgetRepo.GetByIdAsync(budgetId))!);
    }

    public async Task<SavingsGoalDto> RemoveMoneyAsync(int userId, int budgetId, decimal amount, string? notes)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");

        var current    = goal.CurrentAmount ?? 0;
        var newAmount  = Math.Max(0, current - amount);

        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount);
        await _budgetRepo.AddEventAsync(budgetId, -amount, notes);  // negative = remove

        return MapToSavingsDto((await _budgetRepo.GetByIdAsync(budgetId))!);
    }

    public async Task<bool> ResetHistoryAsync(int userId, int budgetId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        await _budgetRepo.DeleteEventsByBudgetIdAsync(budgetId);
        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, 0);
        return true;
    }

    public async Task<IEnumerable<PiggyBankEventDto>> GetEventsAsync(int userId, int budgetId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        var events = await _budgetRepo.GetEventsByBudgetIdAsync(budgetId);
        return events.Select(e => new PiggyBankEventDto
        {
            EventId   = e.EventId,
            Amount    = e.Amount,
            EventDate = e.EventDate,
            Notes     = e.Notes,
        });
    }

    public async Task UpdateSpentAmountAsync(int accountId, decimal delta)
    {
        var budget = await _budgetRepo.GetActiveByAccountIdAsync(accountId);
        if (budget is not null)
            await _budgetRepo.UpdateCurrentAmountAsync(budget.BudgetId, (budget.CurrentAmount ?? 0) + delta);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private static BudgetDto MapToBudgetDto(Budget b) => new()
    {
        BudgetId      = b.BudgetId,
        AccountId     = b.AccountId,
        AccountName   = b.Account?.Name,
        Title         = b.Title,
        TargetAmount  = b.TargetAmount,
        CurrentAmount = b.CurrentAmount ?? 0,
        Percentage    = b.TargetAmount > 0
                        ? Math.Round((b.CurrentAmount ?? 0) / b.TargetAmount * 100, 1)
                        : 0,
        PeriodType    = b.PeriodType,
        StartDate     = b.StartDate,
        EndDate       = b.EndDate,
        IconName      = b.IconName,
        Color         = b.Color,
        IsActive      = b.IsActive ?? true
    };

    private static SavingsGoalDto MapToSavingsDto(Budget b)
    {
        var current    = b.CurrentAmount ?? 0;
        var leftToSave = Math.Max(0, b.TargetAmount - current);
        var monthly    = b.MonthlyContribution ?? 0;

        return new SavingsGoalDto
        {
            BudgetId        = b.BudgetId,
            AccountId       = b.AccountId,
            AccountName     = b.Account?.Name,
            Title           = b.Title,
            TargetAmount    = b.TargetAmount,
            CurrentAmount   = current,
            SavePerMonth    = monthly,
            Percentage      = b.TargetAmount > 0
                              ? Math.Round(current / b.TargetAmount * 100, 1)
                              : 0,
            TargetDate      = b.Deadline,
            IconName        = b.IconName,
            Color           = b.Color,
            IsActive        = b.IsActive ?? true,
            MonthsRemaining = monthly > 0
                ? (int)Math.Ceiling((double)(leftToSave / monthly))
                : null,
            Events = b.PiggyBankEvents.Select(e => new PiggyBankEventDto
            {
                EventId   = e.EventId,
                Amount    = e.Amount,
                EventDate = e.EventDate,
                Notes     = e.Notes,
            }).ToList(),
        };
    }
}