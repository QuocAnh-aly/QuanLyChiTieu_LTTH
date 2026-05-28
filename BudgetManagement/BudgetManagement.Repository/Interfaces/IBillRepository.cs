using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IBillRepository : IBaseRepository<Bill>
{
    Task<IEnumerable<Bill>> GetByUserIdAsync(int userId);
    Task<Bill?> GetByIdWithEntriesAsync(int billId);
    Task<IEnumerable<JournalEntry>> GetLinkedEntriesAsync(int billId);
    Task<IEnumerable<JournalEntry>> GetLinkedEntriesForUserAsync(int userId);
    Task UnlinkAllEntriesAsync(int billId);
    Task LinkEntriesByAmountAsync(int billId, int userId, decimal amountMin, decimal amountMax);
}
