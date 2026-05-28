namespace BudgetManagement.Entities;

public class JournalDetail
{
    public int DetailId { get; set; }
    public int JournalId { get; set; }
    public int AccountId { get; set; }
    public decimal? Debit { get; set; }
    public decimal? Credit { get; set; }

    public JournalEntry JournalEntry { get; set; } = null!;
    public Account Account { get; set; } = null!;
}
