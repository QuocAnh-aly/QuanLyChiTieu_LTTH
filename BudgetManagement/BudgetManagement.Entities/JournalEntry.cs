using System;
using System.Collections.Generic;

namespace BudgetManagement.Entities;

public class JournalEntry
{
    public int JournalId { get; set; }
    public int UserId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? Tags  { get; set; }   // comma-separated tag names
    public decimal? ForeignAmount { get; set; }
    public string? ForeignCurrencyCode { get; set; }
    public DateTime? CreatedAt { get; set; }

    public int? BillId { get; set; }

    // Ngân sách mà giao dịch chi tiêu này được tính vào (một danh mục có thể có
    // nhiều ngân sách). Null = không gắn ngân sách nào.
    public int? BudgetId { get; set; }

    public User User { get; set; } = null!;
    public Bill? Bill { get; set; }
    public Budget? Budget { get; set; }
    public ICollection<JournalDetail> JournalDetails { get; set; } = new List<JournalDetail>();
}
