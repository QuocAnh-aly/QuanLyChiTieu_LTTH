namespace BudgetManagement.Entities;

public class PiggyBankEvent
{
    public int      EventId   { get; set; }
    public int      BudgetId  { get; set; }
    public decimal  Amount    { get; set; }   // dương = nạp, âm = rút
    public DateTime EventDate { get; set; }
    public string?  Notes     { get; set; }

    public Budget Budget { get; set; } = null!;
}
