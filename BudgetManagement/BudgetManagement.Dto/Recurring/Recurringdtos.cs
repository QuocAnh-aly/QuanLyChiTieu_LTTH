namespace BudgetManagement.Dto;

// ─── Request ─────────────────────────────────────────────────────────────────

public class CreateRecurringDto
{
    public int      DebitAccountId  { get; set; }
    public int      CreditAccountId { get; set; }
    public decimal  Amount          { get; set; }
    public string?  Title           { get; set; }
    public string?  Description     { get; set; }
    public string   Frequency       { get; set; } = null!;  // "daily"|"weekly"|"monthly"|"yearly"
    public int?     IntervalValue   { get; set; }            // mỗi N kỳ, mặc định 1
    public DateTime NextRunDate     { get; set; }
}

public class UpdateRecurringDto
{
    public string?   Title           { get; set; }
    public string?   Description     { get; set; }
    public decimal?  Amount          { get; set; }
    public string?   Frequency       { get; set; }
    public int?      IntervalValue   { get; set; }
    public DateTime? NextRunDate     { get; set; }
    public bool?     IsActive        { get; set; }
}

// ─── Response ────────────────────────────────────────────────────────────────

public class RecurringDto
{
    public int       RecurringId       { get; set; }
    public int       DebitAccountId    { get; set; }
    public int       CreditAccountId   { get; set; }
    public string?   DebitAccountName  { get; set; }
    public string?   CreditAccountName { get; set; }
    public decimal   Amount            { get; set; }
    public string?   Title             { get; set; }
    public string?   Description       { get; set; }
    public string    Frequency         { get; set; } = null!;
    public int       IntervalValue     { get; set; }
    public DateTime  NextRunDate       { get; set; }
    public bool      IsActive          { get; set; }
    public DateTime? CreatedAt         { get; set; }
}