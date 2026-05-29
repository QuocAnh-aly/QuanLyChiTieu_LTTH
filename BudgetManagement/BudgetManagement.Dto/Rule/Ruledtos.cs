using System.Text.Json.Serialization;

namespace BudgetManagement.Dto;

// ─── Rule Group ──────────────────────────────────────────────────────────────

public class RuleGroupDto
{
    [JsonPropertyName("group_id")]
    public int GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("rule_count")]
    public int RuleCount { get; set; }
}

public class CreateRuleGroupDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? Order { get; set; }
}

public class UpdateRuleGroupDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }
}

// ─── Rule Trigger / Action ───────────────────────────────────────────────────

public class RuleTriggerDto
{
    [JsonPropertyName("trigger_id")]
    public int TriggerId { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = null!;

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    public int Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool StopProcessing { get; set; }
}

public class RuleActionDto
{
    [JsonPropertyName("action_id")]
    public int ActionId { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = null!;

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    public int Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool StopProcessing { get; set; }
}

public class TriggerInputDto
{
    public string Type  { get; set; } = null!;
    public string? Value { get; set; }
    public int? Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool? StopProcessing { get; set; }
}

public class ActionInputDto
{
    public string Type  { get; set; } = null!;
    public string? Value { get; set; }
    public int? Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool? StopProcessing { get; set; }
}

// ─── Rule ────────────────────────────────────────────────────────────────────

public class RuleDto
{
    [JsonPropertyName("rule_id")]
    public int RuleId { get; set; }

    [JsonPropertyName("group_id")]
    public int? GroupId { get; set; }

    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    public bool Strict { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool StopProcessing { get; set; }

    public int Runs { get; set; }

    [JsonPropertyName("last_run_at")]
    public DateTime? LastRunAt { get; set; }

    public List<RuleTriggerDto> Triggers { get; set; } = new();
    public List<RuleActionDto>  Actions  { get; set; } = new();
}

public class CreateRuleDto
{
    [JsonPropertyName("group_id")]
    public int? GroupId { get; set; }

    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? Order { get; set; }
    public bool? Strict { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool? StopProcessing { get; set; }

    public List<TriggerInputDto> Triggers { get; set; } = new();
    public List<ActionInputDto>  Actions  { get; set; } = new();
}

public class UpdateRuleDto
{
    [JsonPropertyName("group_id")]
    public int? GroupId { get; set; }

    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Order { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    public bool? Strict { get; set; }

    [JsonPropertyName("stop_processing")]
    public bool? StopProcessing { get; set; }

    /// <summary>If set, replaces all triggers.</summary>
    public List<TriggerInputDto>? Triggers { get; set; }

    /// <summary>If set, replaces all actions.</summary>
    public List<ActionInputDto>? Actions { get; set; }
}

// ─── Test / Trigger results ──────────────────────────────────────────────────

public class RuleTestResultDto
{
    [JsonPropertyName("matched_count")]
    public int MatchedCount { get; set; }

    [JsonPropertyName("matched_transactions")]
    public List<RuleMatchedTransactionDto> MatchedTransactions { get; set; } = new();
}

public class RuleMatchedTransactionDto
{
    [JsonPropertyName("journal_id")]
    public int JournalId { get; set; }

    [JsonPropertyName("transaction_date")]
    public DateTime TransactionDate { get; set; }

    public string? Description { get; set; }
    public decimal Amount { get; set; }
}

public class RuleTriggerResultDto
{
    [JsonPropertyName("rule_id")]
    public int RuleId { get; set; }

    [JsonPropertyName("matched_count")]
    public int MatchedCount { get; set; }

    [JsonPropertyName("applied_count")]
    public int AppliedCount { get; set; }
}
