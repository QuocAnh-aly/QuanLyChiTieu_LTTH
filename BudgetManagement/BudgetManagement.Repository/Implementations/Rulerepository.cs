using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class RuleRepository : BaseRepository<Rule>, IRuleRepository
{
    public RuleRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Rule>> GetByUserAsync(int userId)
        => await _dbSet
            .Include(r => r.Triggers)
            .Include(r => r.Actions)
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Order)
            .ThenBy(r => r.RuleId)
            .ToListAsync();

    public async Task<Rule?> GetByIdFullAsync(int ruleId)
        => await _dbSet
            .Include(r => r.Triggers)
            .Include(r => r.Actions)
            .FirstOrDefaultAsync(r => r.RuleId == ruleId);

    public async Task<IEnumerable<RuleGroup>> GetGroupsByUserAsync(int userId)
        => await _context.RuleGroups
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.Order)
            .ToListAsync();

    public async Task<RuleGroup?> GetGroupByIdAsync(int groupId)
        => await _context.RuleGroups.FirstOrDefaultAsync(g => g.GroupId == groupId);

    public async Task<RuleGroup> CreateGroupAsync(RuleGroup group)
    {
        _context.RuleGroups.Add(group);
        await _context.SaveChangesAsync();
        return group;
    }

    public async Task<RuleGroup> UpdateGroupAsync(RuleGroup group)
    {
        _context.RuleGroups.Update(group);
        await _context.SaveChangesAsync();
        return group;
    }

    public async Task<bool> DeleteGroupAsync(int groupId)
    {
        var g = await _context.RuleGroups.FindAsync(groupId);
        if (g is null) return false;
        // Detach rules from the group rather than cascading delete
        await _context.Rules
            .Where(r => r.GroupId == groupId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.GroupId, (int?)null));
        _context.RuleGroups.Remove(g);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task ReplaceTriggersAsync(int ruleId, IEnumerable<RuleTrigger> triggers)
    {
        await _context.RuleTriggers
            .Where(t => t.RuleId == ruleId)
            .ExecuteDeleteAsync();
        await _context.RuleTriggers.AddRangeAsync(triggers);
        await _context.SaveChangesAsync();
    }

    public async Task ReplaceActionsAsync(int ruleId, IEnumerable<RuleAction> actions)
    {
        await _context.RuleActions
            .Where(a => a.RuleId == ruleId)
            .ExecuteDeleteAsync();
        await _context.RuleActions.AddRangeAsync(actions);
        await _context.SaveChangesAsync();
    }

    public async Task RecordRunAsync(int ruleId, int matchedCount)
    {
        var now = DateTime.UtcNow;
        await _dbSet
            .Where(r => r.RuleId == ruleId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Runs, r => (r.Runs ?? 0) + matchedCount)
                .SetProperty(r => r.LastRunAt, now));
    }
}
