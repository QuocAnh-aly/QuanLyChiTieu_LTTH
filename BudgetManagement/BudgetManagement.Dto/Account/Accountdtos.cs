namespace BudgetManagement.Dto;

// ─── Request ─────────────────────────────────────────────────────────────────

public class CreateAccountDto
{
    public int     TypeId       { get; set; }        // 1=Assets 2=Liabilities 3=Equity 4=Revenue 5=Expense
    public string  Name         { get; set; } = null!;
    public string? IconName     { get; set; }        // Lucide icon name
    public string? Color        { get; set; }        // "blue" | "green" ...
    public string? GradientFrom { get; set; }        // "#3b82f6"
    public string? GradientTo   { get; set; }        // "#1d4ed8"
    public decimal? Balance        { get; set; }
    public string? CardNumber      { get; set; }        // "•••• 4892"
    public string  CurrencyCode   { get; set; } = "VND";
    public int?    SourceAccountId { get; set; }      // Optional: tạo transaction từ source account
}

public class UpdateAccountDto
{
    public string? Name         { get; set; }
    public string? IconName     { get; set; }
    public string? Color        { get; set; }
    public string? GradientFrom { get; set; }
    public string? GradientTo   { get; set; }
    public string? CardNumber   { get; set; }
    public string? CurrencyCode { get; set; }
    public bool?   IsActive     { get; set; }
}

// ─── Response ────────────────────────────────────────────────────────────────

public class AccountDto
{
    public int      AccountId    { get; set; }
    public int      TypeId       { get; set; }
    public string?  TypeName     { get; set; }       // "Assets" | "Liabilities" ...
    public string   Name         { get; set; } = null!;
    public string?  IconName     { get; set; }
    public string?  Color        { get; set; }
    public string?  GradientFrom { get; set; }
    public string?  GradientTo   { get; set; }
    public decimal  Balance         { get; set; }
    public decimal  InitialBalance  { get; set; }
    public string?  CardNumber      { get; set; }
    public bool     IsActive        { get; set; }
    public string  CurrencyCode   { get; set; } = "VND";
    public DateTime? CreatedAt      { get; set; }
}

public class WalletSummaryDto
{
    public decimal            TotalAssets      { get; set; }
    public decimal            TotalLiabilities { get; set; }
    public decimal            TotalSavings     { get; set; }
    public decimal            NetWorth         { get; set; }
    /// <summary>All accounts (unpaginated) — dùng cho pie chart, balance distribution</summary>
    public List<AccountDto>   AllAccounts      { get; set; } = [];
    /// <summary>Paginated accounts — dùng cho card grid, details table</summary>
    public List<AccountDto>   Accounts         { get; set; } = [];
    public int                TotalCount       { get; set; }
    public int                Page             { get; set; }
    public int                PageSize         { get; set; }
    public int                TotalPages       => (int)Math.Ceiling((double)TotalCount / (PageSize > 0 ? PageSize : 1));
}