namespace BudgetManagement.Entities;

public class Currency
{
    public int CurrencyId { get; set; }
    public int UserId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Symbol { get; set; } = null!;
    public int? DecimalPlaces { get; set; }
    public bool? IsEnabled { get; set; }
    public bool? IsPrimary { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
