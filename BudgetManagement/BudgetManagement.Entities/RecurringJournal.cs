using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class RecurringJournal
{
    public int RecurringId { get; set; }
    public int UserId { get; set; }
    public int DebitAccountId { get; set; }
    public int CreditAccountId { get; set; }
    public decimal Amount { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string Frequency { get; set; } = null!;
    public int? IntervalValue { get; set; }
    public DateTime NextRunDate { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Account DebitAccount { get; set; } = null!;
    public Account CreditAccount { get; set; } = null!;
    public ICollection<RecurringInstance> RecurringInstances { get; set; } = new List<RecurringInstance>();
}
