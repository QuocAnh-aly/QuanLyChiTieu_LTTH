using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class JournalEntry
{
    public int JournalId { get; set; }
    public int UserId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<JournalDetail> JournalDetails { get; set; } = new List<JournalDetail>();
}
