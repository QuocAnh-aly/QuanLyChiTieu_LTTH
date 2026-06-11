using System.ComponentModel.DataAnnotations;

namespace BudgetManagement.Dto;

// ─── Expense Budget Request (Budget.jsx) ─────────────────────────────────────

public class CreateBudgetDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Phải chọn danh mục chi tiêu")]
    public int      AccountId    { get; set; }

    [Required(ErrorMessage = "Tên ngân sách không được để trống")]
    public string   Title        { get; set; } = null!;

    [Range(0.01, double.MaxValue, ErrorMessage = "Số tiền ngân sách phải lớn hơn 0")]
    public decimal  TargetAmount { get; set; }

    public string?  PeriodType   { get; set; }
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
    public decimal  TargetAmount  { get; set; }
    public decimal  CurrentAmount { get; set; }
    public decimal  Remaining => TargetAmount - CurrentAmount;
    public decimal  Percentage    { get; set; }
    public string?  PeriodType    { get; set; }
    public DateTime StartDate     { get; set; }
    public DateTime? EndDate      { get; set; }
    public string?  IconName      { get; set; }
    public string?  Color         { get; set; }
    public bool     IsActive      { get; set; }
}

// ─── Savings Goal / Piggy Bank Request ───────────────────────────────────────

public class CreateSavingsGoalDto
{
    // AccountId đã bỏ — backend tự tạo Piggy Wallet account
 
    [Required(ErrorMessage = "Tên mục tiêu không được để trống")]
    public string   Title               { get; set; } = null!;
 
    [Range(0.01, double.MaxValue, ErrorMessage = "Số tiền mục tiêu phải lớn hơn 0")]
    public decimal  TargetAmount        { get; set; }
 
    public decimal? InitialAmount       { get; set; }
    public decimal? MonthlyContribution { get; set; }
    public string?  TargetDate          { get; set; }
    public string?  CurrencyCode        { get; set; }  // thêm mới — mặc định "VND" nếu null
    public string?  Notes               { get; set; }
    public string?  IconName            { get; set; }
    public string?  Color               { get; set; }
}
public class UpdateSavingsGoalDto
{
    public string?   Title               { get; set; }
    public decimal?  TargetAmount        { get; set; }
    public decimal?  MonthlyContribution { get; set; }
    public string?   TargetDate          { get; set; }
    public string?   Notes               { get; set; }
    public string?   IconName            { get; set; }
    public string?   Color               { get; set; }
    public bool?     IsActive            { get; set; }
}

// ─── Savings Goal / Piggy Bank Response ──────────────────────────────────────

public class SavingsGoalDto
{
    public int      BudgetId            { get; set; }
    public int      AccountId           { get; set; }
    public string?  AccountName         { get; set; }
    public string   Title               { get; set; } = null!;
    public decimal  TargetAmount        { get; set; }
    public decimal  CurrentAmount       { get; set; }    // saved so far
    public decimal  LeftToSave => Math.Max(0, TargetAmount - CurrentAmount);
    public decimal  Percentage          { get; set; }    // 0-100
    public decimal  SavePerMonth        { get; set; }    // monthly contribution needed/set
    public string?  TargetDate          { get; set; }
    public string?  Notes               { get; set; }
    public string?  IconName            { get; set; }
    public string?  Color               { get; set; }
    public bool     IsActive            { get; set; }
    public int?     MonthsRemaining     { get; set; }
    public List<PiggyBankEventDto> Events { get; set; }= new List<PiggyBankEventDto>();
}

// ─── Piggy Bank Events ────────────────────────────────────────────────────────

public class PiggyBankEventDto
{
    public int      EventId   { get; set; }
    public decimal  Amount    { get; set; }   // positive = add, negative = remove
    public DateTime EventDate { get; set; }
    public string?  Notes     { get; set; }
    public bool     IsAdd     => Amount > 0;
}

public class AddRemoveMoneyDto
{
    public decimal Amount { get; set; }
    public string? Notes  { get; set; }
 
    //Add: ví nguồn bị trừ tiền khi nạp vào lợn.
    public int SourceAccountId      { get; set; }
 
    /// Remove: ví đích nhận tiền khi rút từ lợn.
    public int DestinationAccountId { get; set; }
}

