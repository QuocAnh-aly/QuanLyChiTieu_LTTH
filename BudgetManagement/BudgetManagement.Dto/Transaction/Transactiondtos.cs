namespace BudgetManagement.Dto;

// ─── Request ─────────────────────────────────────────────────────────────────

public class CreateTransactionDto
{
    public int      DebitAccountId    { get; set; }   // Tài khoản bị ghi Nợ
    public int      CreditAccountId   { get; set; }   // Tài khoản bị ghi Có (0 = auto tạo cho thu nhập)
    public decimal  Amount            { get; set; }
    public string?  Description       { get; set; }
    public DateTime? TransactionDate  { get; set; }   // null → dùng DateTime.UtcNow
    public string?  IncomeCategoryName { get; set; }  // Thu nhập: tên danh mục, backend tự tạo Revenue account
}

// ─── Response ────────────────────────────────────────────────────────────────

public class TransactionDto
{
    public int      JournalId       { get; set; }
    public DateTime TransactionDate { get; set; }
    public string?  Description     { get; set; }
    public DateTime? CreatedAt      { get; set; }
    public List<JournalDetailDto> Details { get; set; } = [];

    // Computed — tiện cho frontend hiển thị
    public decimal  TotalAmount =>
        Details.Where(d => d.Debit > 0).Sum(d => d.Debit);
}

public class JournalDetailDto
{
    public int     DetailId    { get; set; }
    public int     AccountId   { get; set; }
    public string? AccountName { get; set; }
    public int     TypeId      { get; set; }   // 1=Assets 4=Revenue 5=Expense …
    public decimal Debit       { get; set; }
    public decimal Credit      { get; set; }
}

// ─── Update Transaction (chỉ mô tả + ngày) ───────────────────────────────────

public class UpdateTransactionDto
{
    public string?   Description     { get; set; }
    public DateTime? TransactionDate { get; set; }
}

public class CashFlowSummaryDto
{
    public decimal  TotalIncome  { get; set; }
    public decimal  TotalExpense { get; set; }
    public decimal  NetCashFlow  { get; set; }
    public DateTime From         { get; set; }
    public DateTime To           { get; set; }
}