using System.Text.Json.Serialization;

namespace BudgetManagement.Dto;

public class SearchTransactionDto
{
    [JsonPropertyName("journal_id")]
    public int JournalId { get; set; }

    [JsonPropertyName("transaction_date")]
    public DateTime TransactionDate { get; set; }

    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    public decimal Amount { get; set; }

    [JsonPropertyName("source_account")]
    public string? SourceAccount { get; set; }

    [JsonPropertyName("destination_account")]
    public string? DestinationAccount { get; set; }
}

public class SearchAccountDto
{
    [JsonPropertyName("account_id")]
    public int AccountId { get; set; }

    public string Name { get; set; } = null!;

    [JsonPropertyName("type_id")]
    public int TypeId { get; set; }

    [JsonPropertyName("type_name")]
    public string? TypeName { get; set; }

    public decimal? Balance { get; set; }

    [JsonPropertyName("currency_code")]
    public string? CurrencyCode { get; set; }
}

public class InsightAggregateDto
{
    public string Key { get; set; } = null!;
    public string Label { get; set; } = null!;
    public decimal Amount { get; set; }
    public int Count { get; set; }
}

public class InsightTotalDto
{
    public decimal Total { get; set; }
    public int Count { get; set; }

    [JsonPropertyName("from")]
    public DateTime From { get; set; }

    [JsonPropertyName("to")]
    public DateTime To { get; set; }
}

public class InsightMonthlyDto
{
    [JsonPropertyName("month")]
    public string Month { get; set; } = null!;   // "2026-05"

    public decimal Income  { get; set; }
    public decimal Expense { get; set; }
}
