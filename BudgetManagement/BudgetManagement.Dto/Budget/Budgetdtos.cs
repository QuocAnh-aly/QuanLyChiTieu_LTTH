namespace BudgetManagement.Dto;

// ─── Expense Budget Request (Budget.jsx) ─────────────────────────────────────

public class CreateBudgetDto
{
    public int      AccountId    { get; set; }      // Expense account (Food, Shopping...)
    public string   Title        { get; set; } = null!;
    public decimal  TargetAmount { get; set; }      // Giới hạn ngân sách
    public string?  PeriodType   { get; set; }      // "daily"|"weekly"|"monthly"|"yearly"
    public DateTime StartDate    { get; set; }
    public DateTime? EndDate     { get; set; }
    public string?  IconName     { get; set; }
    public string?  Color        { get; set; }
}

public class UpdateBudgetDto
{
    public string?   Title        { get; set; }
    public decimal?  TargetAmount { get; set; }
    public string?   PeriodType   { get; set; }
    public DateTime? StartDate    { get; set; }
    public DateTime? EndDate      { get; set; }
    public string?   IconName     { get; set; }
    public string?   Color        { get; set; }
    public bool?     IsActive     { get; set; }
}

// ─── Expense Budget Response ──────────────────────────────────────────────────

public class BudgetDto
{
    public int      BudgetId      { get; set; }
    public int      AccountId     { get; set; }
    public string?  AccountName   { get; set; }
    public string   Title         { get; set; } = null!;
    public decimal  TargetAmount  { get; set; }     // Giới hạn
    public decimal  CurrentAmount { get; set; }     // Đã chi
    public decimal  Remaining => TargetAmount - CurrentAmount;
    public decimal  Percentage    { get; set; }     // 0-100
    public string?  PeriodType    { get; set; }
    public DateTime StartDate     { get; set; }
    public DateTime? EndDate      { get; set; }
    public string?  IconName      { get; set; }
    public string?  Color         { get; set; }
    public bool     IsActive      { get; set; }
}

// ─── Savings Goal Request (Savings.jsx) ──────────────────────────────────────

public class CreateSavingsGoalDto
{
    public int      AccountId            { get; set; }  // Equity account (Savings, Investment...)
    public string   Title                { get; set; } = null!;
    public decimal  TargetAmount         { get; set; }  // Mục tiêu
    public decimal? InitialAmount        { get; set; }  // Đã có sẵn
    public decimal? MonthlyContribution  { get; set; }  // Đóng góp hàng tháng
    public string?  Deadline             { get; set; }  // "Dec 2026"
    public string?  IconName             { get; set; }
    public string?  Color                { get; set; }
}

public class UpdateSavingsGoalDto
{
    public string?   Title               { get; set; }
    public decimal?  TargetAmount        { get; set; }
    public decimal?  MonthlyContribution { get; set; }
    public string?   Deadline            { get; set; }
    public string?   IconName            { get; set; }
    public string?   Color               { get; set; }
    public bool?     IsActive            { get; set; }
}

// ─── Savings Goal Response ────────────────────────────────────────────────────

public class SavingsGoalDto
{
    public int      BudgetId             { get; set; }
    public int      AccountId            { get; set; }
    public string?  AccountName          { get; set; }
    public string   Title                { get; set; } = null!;
    public decimal  TargetAmount         { get; set; }
    public decimal  CurrentAmount        { get; set; }
    public decimal  Remaining => TargetAmount - CurrentAmount;
    public decimal  Percentage           { get; set; }  // 0-100
    public decimal  MonthlyContribution  { get; set; }
    public int?     MonthsRemaining      { get; set; }  // Ước tính
    public string?  Deadline             { get; set; }
    public string?  IconName             { get; set; }
    public string?  Color                { get; set; }
    public bool     IsActive             { get; set; }
}