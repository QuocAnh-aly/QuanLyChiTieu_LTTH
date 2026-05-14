using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class User
{
    public int UserId { get; set; }
    public string UserAccount { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? AvatarInitials { get; set; }
    public string? Theme { get; set; }
    public string? Currency { get; set; }
    public bool NotifyEmail { get; set; }
    public bool NotifyPush { get; set; }
    public bool NotifySms { get; set; }
    public DateTime? CreatedAt { get; set; }

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public ICollection<RecurringJournal> RecurringJournals { get; set; } = new List<RecurringJournal>();
}
