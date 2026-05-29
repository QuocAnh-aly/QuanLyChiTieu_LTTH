namespace BudgetManagement.Entities;

public class Rule
{
    public int RuleId { get; set; }
    public int UserId { get; set; }
    public int? GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? Order { get; set; }
    public bool? IsActive { get; set; }
    public bool? Strict { get; set; }
    public bool? StopProcessing { get; set; }
    public int? Runs { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public RuleGroup? Group { get; set; }
    public ICollection<RuleTrigger> Triggers { get; set; } = new List<RuleTrigger>();
    public ICollection<RuleAction>  Actions  { get; set; } = new List<RuleAction>();
}
