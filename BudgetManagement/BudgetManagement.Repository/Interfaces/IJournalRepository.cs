using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IJournalRepository : IBaseRepository<JournalEntry>
{
    Task<IEnumerable<JournalEntry>> GetByUserIdAsync(int userId, int page, int pageSize);
    Task<IEnumerable<JournalEntry>> GetByDateRangeAsync(int userId, DateTime from, DateTime to);
    Task<IEnumerable<JournalEntry>> GetByDateRangeAndAccountAsync(int userId, DateTime from, DateTime to, int accountId);
    Task<JournalEntry?> GetWithDetailsAsync(int journalId); // include JournalDetails + Accounts
    Task<JournalEntry> CreateWithDetailsAsync(JournalEntry entry, IEnumerable<JournalDetail> details);
    Task<bool> UpdateEntryAsync(int journalId, string? description, string? notes, string? tags, DateTime? transactionDate);
    Task<bool> HasTransaction (int accountId);
}