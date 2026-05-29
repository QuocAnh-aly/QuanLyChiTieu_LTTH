using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IRuleService
{
    // ── Rules ────────────────────────────────────────────────────────────────
    Task<IEnumerable<RuleDto>> GetAllAsync(int userId);
    Task<RuleDto> GetByIdAsync(int userId, int ruleId);
    Task<RuleDto> CreateAsync(int userId, CreateRuleDto request);
    Task<RuleDto> UpdateAsync(int userId, int ruleId, UpdateRuleDto request);
    Task<bool> DeleteAsync(int userId, int ruleId);
    Task<RuleDto> ToggleActiveAsync(int userId, int ruleId);

    // ── Test (dry-run) and Trigger (apply actions) ───────────────────────────
    Task<RuleTestResultDto>    TestAsync(int userId, int ruleId);
    Task<RuleTriggerResultDto> TriggerAsync(int userId, int ruleId);

    // ── Groups ───────────────────────────────────────────────────────────────
    Task<IEnumerable<RuleGroupDto>> GetGroupsAsync(int userId);
    Task<RuleGroupDto> CreateGroupAsync(int userId, CreateRuleGroupDto request);
    Task<RuleGroupDto> UpdateGroupAsync(int userId, int groupId, UpdateRuleGroupDto request);
    Task<bool> DeleteGroupAsync(int userId, int groupId);
}
