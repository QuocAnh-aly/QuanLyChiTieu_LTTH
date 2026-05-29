namespace BudgetManagement.Entities;

public class RuleTrigger
{
    public int TriggerId { get; set; }
    public int RuleId { get; set; }
    public string TriggerType { get; set; } = null!;
    public string? TriggerValue { get; set; }
    public int? Order { get; set; }
    public bool? IsActive { get; set; }
    public bool? StopProcessing { get; set; }

    public Rule Rule { get; set; } = null!;
}
