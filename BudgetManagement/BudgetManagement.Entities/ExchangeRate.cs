namespace BudgetManagement.Entities;

public class ExchangeRate
{
    public int RateId { get; set; }
    public int UserId { get; set; }
    public string FromCurrency { get; set; } = null!;
    public string ToCurrency { get; set; } = null!;
    public decimal Rate { get; set; }
    public DateTime RateDate { get; set; }
    public DateTime? CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
