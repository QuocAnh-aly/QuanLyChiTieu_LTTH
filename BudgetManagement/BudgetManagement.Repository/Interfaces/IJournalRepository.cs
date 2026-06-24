using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IJournalRepository : IBaseRepository<JournalEntry>
{
    Task<IEnumerable<JournalEntry>> GetByUserIdAsync(int userId, int page, int pageSize);
    Task<IEnumerable<JournalEntry>> GetByDateRangeAsync(int userId, DateTime from, DateTime to);
    Task<IEnumerable<JournalEntry>> GetByDateRangeAndAccountAsync(int userId, DateTime from, DateTime to, int accountId);
    Task<IEnumerable<JournalEntry>> GetByBudgetIdAsync(int userId, int budgetId);   // giao dịch đã gán cho một ngân sách
    Task<JournalEntry?> GetWithDetailsAsync(int journalId); // include JournalDetails + Accounts
    Task<JournalEntry> CreateWithDetailsAsync(JournalEntry entry, IEnumerable<JournalDetail> details);
    Task<bool> UpdateEntryAsync(int journalId, string? description, string? notes, string? tags, DateTime? transactionDate);
    Task<bool> HasTransaction (int accountId);
    Task<bool> UpdateEntryAmountAsync(int journalId, decimal newAmount);
    Task<bool> UpdateEntryBudgetAsync(int journalId, int? budgetId);   // gán lại ngân sách cho giao dịch
    Task<bool> UpdateEntryBillAsync(int journalId, int? billId);       // gán lại hóa đơn định kỳ cho giao dịch
    Task UnlinkBudgetEntriesAsync(int budgetId);                        // bỏ gắn ngân sách khỏi mọi giao dịch (trước khi xóa Budget)
    Task<bool> HasDetailsForAccountAsync(int accountId);
}