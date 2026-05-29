using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IRuleRepository : IBaseRepository<Rule>
{
    Task<IEnumerable<Rule>> GetByUserAsync(int userId);
    Task<Rule?> GetByIdFullAsync(int ruleId);
    Task<IEnumerable<RuleGroup>> GetGroupsByUserAsync(int userId);
    Task<RuleGroup?> GetGroupByIdAsync(int groupId);
    Task<RuleGroup> CreateGroupAsync(RuleGroup group);
    Task<RuleGroup> UpdateGroupAsync(RuleGroup group);
    Task<bool> DeleteGroupAsync(int groupId);
    Task ReplaceTriggersAsync(int ruleId, IEnumerable<RuleTrigger> triggers);
    Task ReplaceActionsAsync(int ruleId, IEnumerable<RuleAction> actions);
    Task RecordRunAsync(int ruleId, int matchedCount);
}
