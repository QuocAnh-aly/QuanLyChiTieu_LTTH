using System;

namespace BudgetManagement.Entities;

public class Budget
{
    public int BudgetId { get; set; }
    public int UserId { get; set; }
    public int AccountId { get; set; }
    public string Title { get; set; } = null!;
    public string BudgetType { get; set; } = null!; // 'expense' or 'savings'
    public decimal TargetAmount { get; set; }
    public decimal? CurrentAmount { get; set; }
    public decimal? MonthlyContribution { get; set; }
    public string? PeriodType { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Deadline { get; set; }
    public string? IconName { get; set; }
    public string? Color { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Account Account { get; set; } = null!;
    public ICollection<PiggyBankEvent> PiggyBankEvents { get; set; } = new List<PiggyBankEvent>();
}
