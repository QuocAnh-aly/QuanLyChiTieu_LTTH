using System.Text.Json.Serialization;

namespace BudgetManagement.Dto;

// ─── Currency ────────────────────────────────────────────────────────────────

public class CurrencyDto
{
    [JsonPropertyName("currency_id")]
    public int CurrencyId { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = null!;

    [JsonPropertyName("decimal_places")]
    public int DecimalPlaces { get; set; }

    [JsonPropertyName("is_enabled")]
    public bool IsEnabled { get; set; }

    [JsonPropertyName("is_primary")]
    public bool IsPrimary { get; set; }
}

public class CreateCurrencyDto
{
    public string Code   { get; set; } = null!;
    public string Name   { get; set; } = null!;
    public string Symbol { get; set; } = null!;

    [JsonPropertyName("decimal_places")]
    public int? DecimalPlaces { get; set; }
}

public class UpdateCurrencyDto
{
    public string? Name   { get; set; }
    public string? Symbol { get; set; }

    [JsonPropertyName("decimal_places")]
    public int? DecimalPlaces { get; set; }

    [JsonPropertyName("is_enabled")]
    public bool? IsEnabled { get; set; }
}

// ─── Exchange Rate ───────────────────────────────────────────────────────────

public class ExchangeRateDto
{
    [JsonPropertyName("rate_id")]
    public int RateId { get; set; }

    [JsonPropertyName("from_currency")]
    public string FromCurrency { get; set; } = null!;

    [JsonPropertyName("to_currency")]
    public string ToCurrency { get; set; } = null!;

    public decimal Rate { get; set; }

    [JsonPropertyName("rate_date")]
    public DateTime RateDate { get; set; }
}

public class CreateExchangeRateDto
{
    [JsonPropertyName("from_currency")]
    public string FromCurrency { get; set; } = null!;

    [JsonPropertyName("to_currency")]
    public string ToCurrency { get; set; } = null!;

    public decimal Rate { get; set; }

    [JsonPropertyName("rate_date")]
    public DateTime? RateDate { get; set; }
}

public class UpdateExchangeRateDto
{
    public decimal? Rate { get; set; }

    [JsonPropertyName("rate_date")]
    public DateTime? RateDate { get; set; }
}

public class BulkRatesDto
{
    /// <summary>
    /// Map of {code → rate against primary}, e.g. {"USD":25450,"EUR":27500}
    /// </summary>
    public Dictionary<string, decimal> Rates { get; set; } = new();

    [JsonPropertyName("rate_date")]
    public DateTime? RateDate { get; set; }
}

public class ConvertResultDto
{
    [JsonPropertyName("from")]
    public string From { get; set; } = null!;

    [JsonPropertyName("to")]
    public string To { get; set; } = null!;

    public decimal Amount { get; set; }
    public decimal Result { get; set; }
    public decimal Rate   { get; set; }
}
