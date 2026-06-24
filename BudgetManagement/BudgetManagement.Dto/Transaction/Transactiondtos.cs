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
    public string?  IncomeCategoryName  { get; set; }   // Thu nhập: backend tìm Revenue account có sẵn, không tự tạo
    public string?  ExpenseCategoryName { get; set; }   // Chi tiêu: backend tìm Expense account có sẵn, không tự tạo
    public int?     BillId              { get; set; }   // Gắn giao dịch vào hóa đơn định kỳ (khi "Trả ngay")
    public int?     BudgetId            { get; set; }   // Chi tiêu: ngân sách cụ thể để tính khoản chi (một danh mục có thể có nhiều ngân sách)
}

// ─── Response ────────────────────────────────────────────────────────────────

public class TransactionDto
{
    public int      JournalId       { get; set; }
    public DateTime TransactionDate { get; set; }
    public string?  Description     { get; set; }
    public string?  Notes           { get; set; }
    public string?  Tags            { get; set; }
    public int?     BudgetId        { get; set; }   // ngân sách giao dịch được tính vào (nếu có)
    public int?     BillId          { get; set; }   // hóa đơn định kỳ giao dịch được gắn (nếu có)
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
    public decimal?  Amount          { get; set; }   // null = không đổi, có giá trị = cập nhật số tiền
    public int?      BudgetId        { get; set; }   // gán lại ngân sách: null = giữ nguyên, 0 = bỏ gắn, >0 = đổi sang ngân sách này
    public int?      BillId          { get; set; }   // gán lại hóa đơn: null = giữ nguyên, 0 = bỏ gắn, >0 = gắn vào hóa đơn này
}

public class CashFlowSummaryDto
{
    public decimal  TotalIncome  { get; set; }
    public decimal  TotalExpense { get; set; }
    public decimal  NetCashFlow  { get; set; }
    public DateTime From         { get; set; }
    public DateTime To           { get; set; }
}
