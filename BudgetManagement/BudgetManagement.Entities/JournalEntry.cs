using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class JournalEntry
{
    public int JournalId { get; set; }
    public int UserId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? Tags  { get; set; }   // comma-separated tag names
    public DateTime? CreatedAt { get; set; }

    public int? BillId { get; set; }

    public User User { get; set; } = null!;
    public Bill? Bill { get; set; }
    public ICollection<JournalDetail> JournalDetails { get; set; } = new List<JournalDetail>();
}
