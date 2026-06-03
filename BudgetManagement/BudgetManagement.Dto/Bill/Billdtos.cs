namespace BudgetManagement.Dto;

public class CreateBillDto
{
    public string Name { get; set; } = null!;
    public decimal AmountMin { get; set; }
    public decimal AmountMax { get; set; }
    public DateTime Date { get; set; }
    public string RepeatFreq { get; set; } = "monthly";
    public int Skip { get; set; } = 0;
    public DateTime? EndDate { get; set; }
    public DateTime? ExtensionDate { get; set; }
    public string? Notes { get; set; }
    public string? ObjectGroup { get; set; }
}

public class UpdateBillDto
{
    public string? Name { get; set; }
    public decimal? AmountMin { get; set; }
    public decimal? AmountMax { get; set; }
    public DateTime? Date { get; set; }
    public string? RepeatFreq { get; set; }
    public int? Skip { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? ExtensionDate { get; set; }
    public string? Notes { get; set; }
    public string? ObjectGroup { get; set; }
    public bool? Active { get; set; }
}

public class BillDto
{
    public int BillId { get; set; }
    public string Name { get; set; } = null!;
    public decimal AmountMin { get; set; }
    public decimal AmountMax { get; set; }
    public decimal AverageAmount { get; set; }
    public DateTime Date { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? ExtensionDate { get; set; }
    public string RepeatFreq { get; set; } = null!;
    public int Skip { get; set; }
    public bool Active { get; set; }
    public string? Notes { get; set; }
    public string? ObjectGroup { get; set; }
    public DateTime? NextExpectedMatch { get; set; }

    // "inactive" | "not_expected" | "expected_unpaid" | "paid"
    public string PaidStatus { get; set; } = "not_expected";

    // ID of the most recent matched transaction in current period (0 = none)
    public int PaidTransactionId { get; set; }

    public int MatchedCount { get; set; }
    public DateTime CreatedAt { get; set; }

    // Only populated in GetById
    public List<MatchedTransactionDto> MatchedTransactions { get; set; } = [];
}

public class MatchedTransactionDto
{
    public int JournalId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
}

// A candidate expense transaction considered when (re)scanning a bill.
public class BillMatchCandidate
{
    public int JournalId { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal Amount { get; set; }
}
