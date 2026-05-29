using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class RuleService : IRuleService
{
    private readonly IRuleRepository    _ruleRepo;
    private readonly IJournalRepository _journalRepo;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public RuleService(IRuleRepository ruleRepo, IJournalRepository journalRepo)
    {
        _ruleRepo    = ruleRepo;
        _journalRepo = journalRepo;
    }

    // ─── Rule CRUD ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<RuleDto>> GetAllAsync(int userId)
        => (await _ruleRepo.GetByUserAsync(userId)).Select(MapToDto);

    public async Task<RuleDto> GetByIdAsync(int userId, int ruleId)
    {
        var r = await _ruleRepo.GetByIdFullAsync(ruleId)
                ?? throw new KeyNotFoundException("Rule not found.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();
        return MapToDto(r);
    }

    public async Task<RuleDto> CreateAsync(int userId, CreateRuleDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title is required.");

        var rule = new Rule
        {
            UserId         = userId,
            GroupId        = request.GroupId,
            Title          = request.Title.Trim(),
            Description    = request.Description?.Trim(),
            Order          = request.Order ?? 0,
            IsActive       = true,
            Strict         = request.Strict ?? true,
            StopProcessing = request.StopProcessing ?? false,
            Runs           = 0,
            CreatedAt      = DateTime.UtcNow,
        };
        var created = await _ruleRepo.CreateAsync(rule);

        if (request.Triggers.Count > 0)
            await _ruleRepo.ReplaceTriggersAsync(created.RuleId, request.Triggers.Select(t => MapTrigger(created.RuleId, t)));
        if (request.Actions.Count > 0)
            await _ruleRepo.ReplaceActionsAsync(created.RuleId, request.Actions.Select(a => MapAction(created.RuleId, a)));

        var full = await _ruleRepo.GetByIdFullAsync(created.RuleId);
        return MapToDto(full!);
    }

    public async Task<RuleDto> UpdateAsync(int userId, int ruleId, UpdateRuleDto request)
    {
        var r = await _ruleRepo.GetByIdFullAsync(ruleId)
                ?? throw new KeyNotFoundException("Rule not found.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();

        if (request.Title       != null) r.Title       = request.Title.Trim();
        if (request.Description != null) r.Description = request.Description.Trim();
        if (request.GroupId.HasValue)        r.GroupId        = request.GroupId.Value == 0 ? null : request.GroupId;
        if (request.Order.HasValue)          r.Order          = request.Order;
        if (request.IsActive.HasValue)       r.IsActive       = request.IsActive;
        if (request.Strict.HasValue)         r.Strict         = request.Strict;
        if (request.StopProcessing.HasValue) r.StopProcessing = request.StopProcessing;

        await _ruleRepo.UpdateAsync(r);

        if (request.Triggers != null)
            await _ruleRepo.ReplaceTriggersAsync(ruleId, request.Triggers.Select(t => MapTrigger(ruleId, t)));
        if (request.Actions != null)
            await _ruleRepo.ReplaceActionsAsync(ruleId, request.Actions.Select(a => MapAction(ruleId, a)));

        var full = await _ruleRepo.GetByIdFullAsync(ruleId);
        return MapToDto(full!);
    }

    public async Task<bool> DeleteAsync(int userId, int ruleId)
    {
        var r = await _ruleRepo.GetByIdAsync(ruleId)
                ?? throw new KeyNotFoundException("Rule not found.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();
        return await _ruleRepo.DeleteAsync(ruleId);
    }

    public async Task<RuleDto> ToggleActiveAsync(int userId, int ruleId)
    {
        var r = await _ruleRepo.GetByIdFullAsync(ruleId)
                ?? throw new KeyNotFoundException("Rule not found.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();
        r.IsActive = !(r.IsActive ?? true);
        await _ruleRepo.UpdateAsync(r);
        return MapToDto(r);
    }

    // ─── Test (dry-run) and Trigger (apply) ──────────────────────────────────

    public async Task<RuleTestResultDto> TestAsync(int userId, int ruleId)
    {
        var rule = await _ruleRepo.GetByIdFullAsync(ruleId)
                   ?? throw new KeyNotFoundException("Rule not found.");
        if (rule.UserId != userId) throw new UnauthorizedAccessException();

        var allEntries = await _journalRepo.GetByUserIdAsync(userId, 1, 1_000);
        var matched = allEntries.Where(e => Matches(rule, e)).ToList();

        return new RuleTestResultDto
        {
            MatchedCount = matched.Count,
            MatchedTransactions = matched.Take(50).Select(e => new RuleMatchedTransactionDto
            {
                JournalId       = e.JournalId,
                TransactionDate = e.TransactionDate,
                Description     = e.Description,
                Amount          = e.JournalDetails?.Sum(d => d.Debit ?? 0) ?? 0m,
            }).ToList(),
        };
    }

    public async Task<RuleTriggerResultDto> TriggerAsync(int userId, int ruleId)
    {
        var rule = await _ruleRepo.GetByIdFullAsync(ruleId)
                   ?? throw new KeyNotFoundException("Rule not found.");
        if (rule.UserId != userId) throw new UnauthorizedAccessException();

        var allEntries = (await _journalRepo.GetByUserIdAsync(userId, 1, 1_000)).ToList();
        var matched = allEntries.Where(e => Matches(rule, e)).ToList();

        int applied = 0;
        foreach (var entry in matched)
        {
            var changed = await ApplyActionsAsync(rule, entry);
            if (changed) applied++;
        }

        await _ruleRepo.RecordRunAsync(ruleId, matched.Count);

        return new RuleTriggerResultDto
        {
            RuleId       = ruleId,
            MatchedCount = matched.Count,
            AppliedCount = applied,
        };
    }

    // ─── Rule Groups ─────────────────────────────────────────────────────────

    public async Task<IEnumerable<RuleGroupDto>> GetGroupsAsync(int userId)
    {
        var groups = await _ruleRepo.GetGroupsByUserAsync(userId);
        var rules  = await _ruleRepo.GetByUserAsync(userId);
        var countByGroup = rules
            .Where(r => r.GroupId.HasValue)
            .GroupBy(r => r.GroupId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        return groups.Select(g => new RuleGroupDto
        {
            GroupId     = g.GroupId,
            Title       = g.Title,
            Description = g.Description,
            Order       = g.Order ?? 0,
            IsActive    = g.IsActive ?? true,
            RuleCount   = countByGroup.GetValueOrDefault(g.GroupId, 0),
        });
    }

    public async Task<RuleGroupDto> CreateGroupAsync(int userId, CreateRuleGroupDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title is required.");

        var g = new RuleGroup
        {
            UserId      = userId,
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Order       = request.Order ?? 0,
            IsActive    = true,
            CreatedAt   = DateTime.UtcNow,
        };
        var created = await _ruleRepo.CreateGroupAsync(g);
        return new RuleGroupDto
        {
            GroupId     = created.GroupId,
            Title       = created.Title,
            Description = created.Description,
            Order       = created.Order ?? 0,
            IsActive    = created.IsActive ?? true,
            RuleCount   = 0,
        };
    }

    public async Task<RuleGroupDto> UpdateGroupAsync(int userId, int groupId, UpdateRuleGroupDto request)
    {
        var g = await _ruleRepo.GetGroupByIdAsync(groupId)
                ?? throw new KeyNotFoundException("Rule group not found.");
        if (g.UserId != userId) throw new UnauthorizedAccessException();

        if (request.Title       != null) g.Title       = request.Title.Trim();
        if (request.Description != null) g.Description = request.Description.Trim();
        if (request.Order.HasValue)      g.Order       = request.Order;
        if (request.IsActive.HasValue)   g.IsActive    = request.IsActive;

        var updated = await _ruleRepo.UpdateGroupAsync(g);
        return new RuleGroupDto
        {
            GroupId     = updated.GroupId,
            Title       = updated.Title,
            Description = updated.Description,
            Order       = updated.Order ?? 0,
            IsActive    = updated.IsActive ?? true,
            RuleCount   = 0,
        };
    }

    public async Task<bool> DeleteGroupAsync(int userId, int groupId)
    {
        var g = await _ruleRepo.GetGroupByIdAsync(groupId)
                ?? throw new KeyNotFoundException("Rule group not found.");
        if (g.UserId != userId) throw new UnauthorizedAccessException();
        return await _ruleRepo.DeleteGroupAsync(groupId);
    }

    // ─── Evaluator ───────────────────────────────────────────────────────────

    private static bool Matches(Rule rule, JournalEntry entry)
    {
        var activeTriggers = rule.Triggers.Where(t => t.IsActive != false).ToList();
        if (activeTriggers.Count == 0) return false;

        bool strict = rule.Strict ?? true;
        return strict
            ? activeTriggers.All(t => EvaluateTrigger(t, entry))
            : activeTriggers.Any(t => EvaluateTrigger(t, entry));
    }

    private static bool EvaluateTrigger(RuleTrigger t, JournalEntry entry)
    {
        var value  = (t.TriggerValue ?? "").Trim();
        var desc   = entry.Description ?? "";
        var amount = entry.JournalDetails?.Sum(d => d.Debit ?? 0) ?? 0m;
        var details = entry.JournalDetails?.ToList() ?? new List<JournalDetail>();
        var (sourceAcct, destAcct, txType) = ClassifyEntry(details);

        switch (t.TriggerType.ToLowerInvariant())
        {
            case "description_contains":
                return !string.IsNullOrEmpty(value) &&
                       desc.Contains(value, StringComparison.OrdinalIgnoreCase);

            case "description_is":
                return string.Equals(desc.Trim(), value, StringComparison.OrdinalIgnoreCase);

            case "amount_more":
                return decimal.TryParse(value, out var more) && amount > more;

            case "amount_less":
                return decimal.TryParse(value, out var less) && amount < less;

            case "amount_exactly":
                return decimal.TryParse(value, out var ex) && amount == ex;

            case "source_account_is":
                return sourceAcct is not null &&
                       (sourceAcct.Name.Equals(value, StringComparison.OrdinalIgnoreCase) ||
                        sourceAcct.AccountId.ToString() == value);

            case "destination_account_is":
                return destAcct is not null &&
                       (destAcct.Name.Equals(value, StringComparison.OrdinalIgnoreCase) ||
                        destAcct.AccountId.ToString() == value);

            case "transaction_type":
                return string.Equals(txType, value, StringComparison.OrdinalIgnoreCase);

            case "tag_is":
                return SplitTags(entry.Tags).Any(tag => tag.Equals(value, StringComparison.OrdinalIgnoreCase));

            case "has_no_category":
                return destAcct is null || destAcct.TypeId != TypeExpense;

            case "category_is":
                return destAcct is not null &&
                       destAcct.TypeId == TypeExpense &&
                       destAcct.Name.Equals(value, StringComparison.OrdinalIgnoreCase);

            case "date_after":
                return DateTime.TryParse(value, out var dAfter)  && entry.TransactionDate > dAfter;

            case "date_before":
                return DateTime.TryParse(value, out var dBefore) && entry.TransactionDate < dBefore;

            default:
                return false;
        }
    }

    private async Task<bool> ApplyActionsAsync(Rule rule, JournalEntry entry)
    {
        bool changed = false;
        var currentTags = SplitTags(entry.Tags).ToList();

        foreach (var a in rule.Actions.Where(a => a.IsActive != false).OrderBy(a => a.Order ?? 0))
        {
            var value = a.ActionValue?.Trim() ?? "";
            switch (a.ActionType.ToLowerInvariant())
            {
                case "set_description":
                    if (!string.IsNullOrEmpty(value) && entry.Description != value)
                    {
                        entry.Description = value;
                        changed = true;
                    }
                    break;

                case "append_description":
                    if (!string.IsNullOrEmpty(value))
                    {
                        entry.Description = (entry.Description ?? "") + value;
                        changed = true;
                    }
                    break;

                case "set_notes":
                    if (entry.Notes != value)
                    {
                        entry.Notes = value;
                        changed = true;
                    }
                    break;

                case "append_notes":
                    if (!string.IsNullOrEmpty(value))
                    {
                        entry.Notes = (entry.Notes ?? "") + value;
                        changed = true;
                    }
                    break;

                case "add_tag":
                    if (!string.IsNullOrEmpty(value) &&
                        !currentTags.Any(t => t.Equals(value, StringComparison.OrdinalIgnoreCase)))
                    {
                        currentTags.Add(value);
                        changed = true;
                    }
                    break;

                case "remove_tag":
                    var before = currentTags.Count;
                    currentTags = currentTags
                        .Where(t => !t.Equals(value, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                    if (currentTags.Count != before) changed = true;
                    break;

                case "clear_tags":
                    if (currentTags.Count > 0)
                    {
                        currentTags.Clear();
                        changed = true;
                    }
                    break;

                case "link_to_bill":
                    if (int.TryParse(value, out var billId) && entry.BillId != billId)
                    {
                        entry.BillId = billId;
                        changed = true;
                    }
                    break;
            }
        }

        if (changed)
        {
            await _journalRepo.UpdateEntryAsync(
                entry.JournalId,
                entry.Description,
                entry.Notes,
                string.Join(',', currentTags),
                null);
        }
        return changed;
    }

    private static (Account? source, Account? destination, string type) ClassifyEntry(List<JournalDetail> details)
    {
        var debit  = details.FirstOrDefault(d => (d.Debit  ?? 0) > 0)?.Account;
        var credit = details.FirstOrDefault(d => (d.Credit ?? 0) > 0)?.Account;

        string type = "transfer";
        if (debit?.TypeId == TypeExpense)       type = "withdrawal";
        else if (credit?.TypeId == TypeRevenue) type = "deposit";

        return (credit, debit, type);
    }

    private static IEnumerable<string> SplitTags(string? raw)
        => string.IsNullOrWhiteSpace(raw)
            ? Array.Empty<string>()
            : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private static RuleDto MapToDto(Rule r) => new()
    {
        RuleId         = r.RuleId,
        GroupId        = r.GroupId,
        Title          = r.Title,
        Description    = r.Description,
        Order          = r.Order ?? 0,
        IsActive       = r.IsActive ?? true,
        Strict         = r.Strict ?? true,
        StopProcessing = r.StopProcessing ?? false,
        Runs           = r.Runs ?? 0,
        LastRunAt      = r.LastRunAt,
        Triggers       = r.Triggers.OrderBy(t => t.Order ?? 0).Select(t => new RuleTriggerDto
        {
            TriggerId      = t.TriggerId,
            Type           = t.TriggerType,
            Value          = t.TriggerValue,
            Order          = t.Order ?? 0,
            IsActive       = t.IsActive ?? true,
            StopProcessing = t.StopProcessing ?? false,
        }).ToList(),
        Actions = r.Actions.OrderBy(a => a.Order ?? 0).Select(a => new RuleActionDto
        {
            ActionId       = a.ActionId,
            Type           = a.ActionType,
            Value          = a.ActionValue,
            Order          = a.Order ?? 0,
            IsActive       = a.IsActive ?? true,
            StopProcessing = a.StopProcessing ?? false,
        }).ToList(),
    };

    private static RuleTrigger MapTrigger(int ruleId, TriggerInputDto t) => new()
    {
        RuleId         = ruleId,
        TriggerType    = t.Type,
        TriggerValue   = t.Value,
        Order          = t.Order ?? 0,
        IsActive       = t.IsActive ?? true,
        StopProcessing = t.StopProcessing ?? false,
    };

    private static RuleAction MapAction(int ruleId, ActionInputDto a) => new()
    {
        RuleId         = ruleId,
        ActionType     = a.Type,
        ActionValue    = a.Value,
        Order          = a.Order ?? 0,
        IsActive       = a.IsActive ?? true,
        StopProcessing = a.StopProcessing ?? false,
    };
}
