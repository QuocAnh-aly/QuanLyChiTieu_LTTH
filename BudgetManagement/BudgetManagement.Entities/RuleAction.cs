namespace BudgetManagement.Entities;

public class RuleAction
{
    public int ActionId { get; set; }
    public int RuleId { get; set; }
    public string ActionType { get; set; } = null!;
    public string? ActionValue { get; set; }
    public int? Order { get; set; }
    public bool? IsActive { get; set; }
    public bool? StopProcessing { get; set; }

    public Rule Rule { get; set; } = null!;
}
