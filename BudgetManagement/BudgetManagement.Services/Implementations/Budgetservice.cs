using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class BudgetService : IBudgetService
{
    private readonly IBudgetRepository  _budgetRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalRepository _journalRepo;

    public BudgetService(IBudgetRepository budgetRepo, IAccountRepository accountRepo, IJournalRepository journalRepo)
    {
        _budgetRepo  = budgetRepo;
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
    }

    private const int TypeExpenseAccount = 5;
    private const int TypeSavingsAccount = 1;


    // ─── Expense Budgets (Budget.jsx) ───────────────────────────────────────

    public async Task<IEnumerable<BudgetDto>> GetExpenseBudgetsAsync(int userId)
    {
        var budgets = await _budgetRepo.GetExpenseBudgetsAsync(userId);
        return budgets.Select(MapToBudgetDto);
    }

    public async Task<PaginatedResult<BudgetDto>> GetExpenseBudgetsPagedAsync(int userId, int page, int pageSize, string? search = null, string? filterStatus = null, string? sortBy = null)
    {
        var result = await _budgetRepo.GetExpenseBudgetsPagedAsync(userId, page, pageSize, search, filterStatus, sortBy);
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
        // Kiểm tra AccountId hợp lệ
        if (request.AccountId <= 0)
            throw new ArgumentException("Phải chọn danh mục chi tiêu cho ngân sách.");

        // Lấy Expense Account có sẵn — không tự động tạo mới
        var expenseAccount = await _accountRepo.GetWithDetailsAsync(request.AccountId)
                             ?? throw new KeyNotFoundException("Danh mục chi tiêu không tồn tại.");

        if (expenseAccount.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        if (expenseAccount.TypeId != TypeExpenseAccount)
            throw new ArgumentException("Danh mục được chọn phải là danh mục chi tiêu (Expense).");

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
            IconName            = expenseAccount.IconName ?? "Coffee",
            Color               = expenseAccount.Color ?? "orange",
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
        var piggyAccount = new Account
        {
            UserId         = userId,
            TypeId         = TypeSavingsAccount,
            Name           = $"Piggy Wallet – {request.Title}",
            IconName       = request.IconName ?? "PiggyBank",
            Color          = request.Color    ?? "green",
            Balance        = request.InitialAmount ?? 0,
            InitialBalance = request.InitialAmount ?? 0,
            CurrencyCode   = request.CurrencyCode ?? "VND",
            IsActive       = true,
            CreatedAt      = DateTime.UtcNow
        };

         var createdAccount = await _accountRepo.CreateAsync(piggyAccount);

        var goal = new Budget
        {
            UserId               = userId,
            AccountId            = createdAccount.AccountId,
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

        if ( request.Title is not null && goal.AccountId >0)
        {
              var account = await _accountRepo.GetWithDetailsAsync(goal.AccountId);
            if (account is not null && account.TypeId == TypeSavingsAccount)
            {
                account.Name    = $"Piggy Wallet – {request.Title}";
                account.IconName = request.IconName ?? account.IconName;
                account.Color   = request.Color    ?? account.Color;
                await _accountRepo.UpdateAsync(account);
            }
        }
        var updated = await _budgetRepo.UpdateAsync(goal);
        return MapToSavingsDto(updated);
    }

    public async Task<SavingsGoalDto> AddMoneyAsync(int userId, int budgetId, decimal amount, string? notes, int sourceAccountId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");

        var sourceAccount = await _accountRepo.GetByIdAsync(sourceAccountId)
                    ?? throw new KeyNotFoundException("Source account not found.");
        if (sourceAccount.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        var piggyAccount = await _accountRepo.GetByIdAsync(goal.AccountId)
                       ?? throw new KeyNotFoundException("Piggy Wallet account not found.");
    // Tạo Journal: chuyển tiền từ ví nguồn → lợn tiết kiệm
    //   Debit  Piggy Wallet  (TypeSavings — tăng balance lợn)
    //   Credit Source Wallet (Assets      — giảm balance ví)
        var entry = new JournalEntry
        {
            UserId          = userId,
            TransactionDate = DateTime.UtcNow,
            Description     = $"Nạp tiền vào lợn: {goal.Title}",
            Notes           = notes,
            CreatedAt       = DateTime.UtcNow
        };
 
        var details = new List<JournalDetail>
        {
            new() { AccountId = piggyAccount.AccountId,  Debit  = amount, Credit = 0 },
            new() { AccountId = sourceAccount.AccountId, Credit = amount, Debit  = 0 }
        };
 
        await _journalRepo.CreateWithDetailsAsync(entry, details);
 
    // Cập nhật balance 2 account
    //   Piggy Wallet (TypeSavings = Assets-like) → +amount
    //   Source Wallet (Assets)                   → -amount
        await _accountRepo.UpdateBalanceAsync(piggyAccount.AccountId, + amount);
        await _accountRepo.UpdateBalanceAsync(sourceAccount.AccountId, - amount);
 
    // Cập nhật CurrentAmount trên Budget (clamp to target)
        var newAmount = Math.Min((goal.CurrentAmount ?? 0) + amount, goal.TargetAmount);
        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount);
        await _budgetRepo.AddEventAsync(budgetId, amount, notes);
 
        return MapToSavingsDto((await _budgetRepo.GetByIdAsync(budgetId))!);
    }

    public async Task<SavingsGoalDto> RemoveMoneyAsync(int userId, int budgetId, decimal amount, string? notes, int destinationAccountId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
               ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");
 
        var current = goal.CurrentAmount ?? 0;
        if (amount > current)
            throw new ArgumentException("Số tiền rút vượt quá số dư hiện tại trong lợn.");
 
    // Validate ví đích
        var destinationAccount = await _accountRepo.GetByIdAsync(destinationAccountId)
                             ?? throw new KeyNotFoundException("Destination account not found.");
    if (destinationAccount.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
 
        var piggyAccount = await _accountRepo.GetByIdAsync(goal.AccountId)
                       ?? throw new KeyNotFoundException("Piggy Wallet account not found.");
 
    // Tạo Journal: rút tiền từ lợn → ví đích
    //   Debit  Destination Wallet (Assets      — tăng balance ví)
    //   Credit Piggy Wallet       (TypeSavings — giảm balance lợn)
        var entry = new JournalEntry
        {
            UserId          = userId,
            TransactionDate = DateTime.UtcNow,
            Description     = $"Rút tiền từ lợn: {goal.Title}",
            Notes           = notes,
            CreatedAt       = DateTime.UtcNow
        };
 
        var details = new List<JournalDetail>
        {
            new() { AccountId = destinationAccount.AccountId, Debit  = amount, Credit = 0 },
            new() { AccountId = piggyAccount.AccountId,       Credit = amount, Debit  = 0 }
        };
 
        await _journalRepo.CreateWithDetailsAsync(entry, details);
 
    // Cập nhật balance 2 account
        await _accountRepo.UpdateBalanceAsync(destinationAccount.AccountId, + amount);
        await _accountRepo.UpdateBalanceAsync(piggyAccount.AccountId, - amount);
 
    // Cập nhật CurrentAmount trên Budget
        var newAmount = Math.Max(0, current - amount);
        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount);
        await _budgetRepo.AddEventAsync(budgetId, -amount, notes);
 
        return MapToSavingsDto((await _budgetRepo.GetByIdAsync(budgetId))!);
}
    public async Task<bool> ResetHistoryAsync(int userId, int budgetId)
    {
        var goal = await _budgetRepo.GetByIdAsync(budgetId)
                   ?? throw new KeyNotFoundException("Savings goal not found.");
        if (goal.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        var current = goal.CurrentAmount ?? 0;

        await _budgetRepo.DeleteEventsByBudgetIdAsync(budgetId);
        await _budgetRepo.UpdateCurrentAmountAsync(budgetId, 0);

        if (current >0 && goal.AccountId >0)
        {
            await _accountRepo.UpdateBalanceAsync(goal.AccountId, -current);
        } 
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

    private static int CalculatePeriodsElapsed(DateTime startDate, string periodType, DateTime now)
    {
        return periodType.ToLower() switch
        {
            "weekly"  => (int)((now.Date - startDate.Date).TotalDays / 7),
            "monthly" => CalcMonthlyPeriods(startDate, now),
            "yearly"  => now.Year - startDate.Year
                         - (now < startDate.AddYears(now.Year - startDate.Year) ? 1 : 0),
            _         => 0
        };
    }

    private static int CalcMonthlyPeriods(DateTime startDate, DateTime now)
    {
        var months = (now.Year - startDate.Year) * 12 + now.Month - startDate.Month;
        // Handle variable-day months (e.g., Jan 31 + 1 month = Feb 28)
        if (now < startDate.AddMonths(months)) months--;
        return Math.Max(0, months);
    }

    public async Task ResetExpiredPeriodsAsync()
    {
        var budgets = await _budgetRepo.GetExpenseBudgetsNeedingResetAsync();
        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        foreach (var budget in budgets)
        {
            var periodType = budget.PeriodType ?? "monthly";

            // So sánh số thứ tự period hôm nay vs hôm qua
            // Nếu khác nhau → vừa sang kỳ mới → reset CurrentAmount về 0
            var periodsToday     = CalculatePeriodsElapsed(budget.StartDate, periodType, today);
            var periodsYesterday = CalculatePeriodsElapsed(budget.StartDate, periodType, yesterday);

            if (periodsToday > periodsYesterday)
            {
                await _budgetRepo.UpdateCurrentAmountAsync(budget.BudgetId, 0);
            }
        }
    }

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