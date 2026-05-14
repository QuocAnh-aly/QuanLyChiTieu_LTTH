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
            Deadline             = request.Deadline,
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
        goal.Deadline            = request.Deadline            ?? goal.Deadline;
        goal.IconName            = request.IconName            ?? goal.IconName;
        goal.Color               = request.Color               ?? goal.Color;
        goal.IsActive            = request.IsActive            ?? goal.IsActive;

        var updated = await _budgetRepo.UpdateAsync(goal);
        return MapToSavingsDto(updated);
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

    private static SavingsGoalDto MapToSavingsDto(Budget b) => new()
    {
        BudgetId             = b.BudgetId,
        AccountId            = b.AccountId,
        AccountName          = b.Account?.Name,
        Title                = b.Title,
        TargetAmount         = b.TargetAmount,
        CurrentAmount        = b.CurrentAmount ?? 0,
        MonthlyContribution  = b.MonthlyContribution ?? 0,
        Percentage           = b.TargetAmount > 0
                               ? Math.Round((b.CurrentAmount ?? 0) / b.TargetAmount * 100, 1)
                               : 0,
        Deadline             = b.Deadline,
        IconName             = b.IconName,
        Color                = b.Color,
        IsActive             = b.IsActive ?? true,
        // Ước tính số tháng còn lại
        MonthsRemaining      = b.MonthlyContribution > 0
            ? (int)Math.Ceiling((double)((b.TargetAmount - (b.CurrentAmount ?? 0)) / b.MonthlyContribution))
            : null
    };
}