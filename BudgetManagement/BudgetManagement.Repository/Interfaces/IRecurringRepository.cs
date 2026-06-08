using BudgetManagement.Dto;
using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IRecurringRepository : IBaseRepository<RecurringJournal>
{
    Task<IEnumerable<RecurringJournal>> GetByUserIdAsync(int userId);
    Task<PaginatedResult<RecurringJournal>> GetByUserIdPagedAsync(int userId, int page, int pageSize);
    Task<IEnumerable<RecurringJournal>> GetDueAsync(DateTime asOf);  // NextRunDate <= asOf
    Task<IEnumerable<RecurringInstance>> GetInstancesByRecurringIdAsync(int recurringId);
    Task<RecurringInstance> AddInstanceAsync(RecurringInstance instance);
    Task<bool> HasJournalsForAccountAsync(int accountId);
}