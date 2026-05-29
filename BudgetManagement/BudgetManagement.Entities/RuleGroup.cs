namespace BudgetManagement.Entities;

public class RuleGroup
{
    public int GroupId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? Order { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Rule> Rules { get; set; } = new List<Rule>();
}
