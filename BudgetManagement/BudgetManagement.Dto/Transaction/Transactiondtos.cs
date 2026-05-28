namespace BudgetManagement.Dto;

// ─── Request ─────────────────────────────────────────────────────────────────

public class CreateTransactionDto
{
    public int      DebitAccountId      { get; set; }
    public int      CreditAccountId     { get; set; }
    public decimal  Amount              { get; set; }
    public string?  Description         { get; set; }
    public string?  Notes               { get; set; }
    public string?  Tags                { get; set; }   // comma-separated tag names
    public DateTime? TransactionDate    { get; set; }
    public string?  IncomeCategoryName  { get; set; }   // Thu nhập: backend tự tạo Revenue account
    public string?  ExpenseCategoryName { get; set; }   // Chi tiêu: backend tự tạo Expense account
}

// ─── Response ────────────────────────────────────────────────────────────────

public class TransactionDto
{
    public int      JournalId       { get; set; }
    public DateTime TransactionDate { get; set; }
    public string?  Description     { get; set; }
    public string?  Notes           { get; set; }
    public string?  Tags            { get; set; }
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

// ─── Update Transaction ───────────────────────────────────────────────────────

public class UpdateTransactionDto
{
    public string?   Description     { get; set; }
    public string?   Notes           { get; set; }
    public string?   Tags            { get; set; }
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
