using BudgetManagement.Dto;
using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IBillRepository : IBaseRepository<Bill>
{
    Task<IEnumerable<Bill>> GetByUserIdAsync(int userId);
    Task<PaginatedResult<Bill>> GetByUserIdPagedAsync(int userId, int page, int pageSize);
    Task<Bill?> GetByIdWithEntriesAsync(int billId);
    Task<IEnumerable<JournalEntry>> GetLinkedEntriesAsync(int billId);
    Task<IEnumerable<JournalEntry>> GetLinkedEntriesForUserAsync(int userId);
    Task UnlinkAllEntriesAsync(int billId);
    Task LinkEntriesByAmountAsync(int billId, int userId, decimal amountMin, decimal amountMax);

    // Unlinked expense transactions in [amountMin, amountMax] dated in [fromDate, toDate).
    Task<List<BillMatchCandidate>> GetMatchCandidatesAsync(
        int userId, decimal amountMin, decimal amountMax, DateTime fromDate, DateTime toDate);

    // Link the given journal entries to a bill (only those not already linked).
    Task LinkEntriesAsync(int billId, IEnumerable<int> journalIds);
}
