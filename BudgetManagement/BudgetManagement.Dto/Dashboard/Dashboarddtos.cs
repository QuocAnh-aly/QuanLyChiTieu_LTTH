namespace BudgetManagement.Dto;

// ─── Response ────────────────────────────────────────────────────────────────

public class DashboardSummaryDto
{
    // Wallet overview
    public decimal TotalBalance     { get; set; }   // NetWorth
    public decimal TotalAssets      { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalSavings     { get; set; }

    // Cash flow tháng hiện tại
    public decimal MonthlyIncome    { get; set; }
    public decimal MonthlyExpense   { get; set; }
    public decimal NetCashFlow      { get; set; }

    // Widgets
    public List<TransactionDto>      RecentTransactions  { get; set; } = [];
    public List<CategorySpendingDto> SpendingByCategory  { get; set; } = [];
    public MonthlyTrendDto?          MonthlyTrend        { get; set; }
}

public class CategorySpendingDto
{
    public int     AccountId   { get; set; }
    public string  AccountName { get; set; } = null!;
    public string? IconName    { get; set; }
    public string? Color       { get; set; }
    public decimal Amount      { get; set; }
    public decimal Percentage  { get; set; }    // % trên tổng chi tiêu
}

public class MonthlyTrendDto
{
    public List<MonthlyTrendPointDto> Points { get; set; } = [];
}

public class MonthlyTrendPointDto
{
    public string  Month   { get; set; } = null!;   // "Jan 2026"
    public decimal Income  { get; set; }
    public decimal Expense { get; set; }
    public decimal Net => Income - Expense;
}