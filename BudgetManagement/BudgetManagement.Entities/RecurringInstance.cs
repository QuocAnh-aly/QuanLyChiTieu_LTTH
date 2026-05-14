using System;

namespace BudgetManagement.Entities;

public class RecurringInstance
{
    public int InstanceId { get; set; }
    public int RecurringId { get; set; }
    public DateTime DueDate { get; set; }
    public string? Status { get; set; }
    public int? JournalId { get; set; }

    public RecurringJournal RecurringJournal { get; set; } = null!;
    public JournalEntry? JournalEntry { get; set; }
}
