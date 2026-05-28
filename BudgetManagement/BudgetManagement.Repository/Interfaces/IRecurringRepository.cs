using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IRecurringRepository : IBaseRepository<RecurringJournal>
{
    Task<IEnumerable<RecurringJournal>> GetByUserIdAsync(int userId);
    Task<IEnumerable<RecurringJournal>> GetDueAsync(DateTime asOf);  // NextRunDate <= asOf
    Task<IEnumerable<RecurringInstance>> GetInstancesByRecurringIdAsync(int recurringId);
    Task<RecurringInstance> AddInstanceAsync(RecurringInstance instance);
}