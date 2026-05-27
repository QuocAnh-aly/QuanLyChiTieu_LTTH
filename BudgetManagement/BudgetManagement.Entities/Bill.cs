namespace BudgetManagement.Entities;

public class Bill
{
    public int BillId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = null!;
    public decimal AmountMin { get; set; }
    public decimal AmountMax { get; set; }
    public DateTime Date { get; set; }          // cycle reference date
    public DateTime? EndDate { get; set; }
    public DateTime? ExtensionDate { get; set; }
    public string RepeatFreq { get; set; } = "monthly";
    public int Skip { get; set; } = 0;
    public bool Active { get; set; } = true;
    public string? Notes { get; set; }
    public string? ObjectGroup { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
}
