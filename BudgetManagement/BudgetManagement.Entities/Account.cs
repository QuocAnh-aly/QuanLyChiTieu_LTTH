using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class Account
{
    public int AccountId { get; set; }
    public int UserId { get; set; }
    public int TypeId { get; set; }
    public string Name { get; set; } = null!;
    public string? IconName { get; set; }
    public string? Color { get; set; }
    public string? GradientFrom { get; set; }
    public string? GradientTo { get; set; }
    public decimal? Balance { get; set; }
    public decimal? InitialBalance { get; set; }
    public string? CardNumber { get; set; }
    public string CurrencyCode { get; set; } = "VND";
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public AccountType AccountType { get; set; } = null!;
    
    public ICollection<JournalDetail> JournalDetails { get; set; } = new List<JournalDetail>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
}
