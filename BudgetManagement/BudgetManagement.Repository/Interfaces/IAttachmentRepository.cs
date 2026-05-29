using BudgetManagement.Entities;

namespace BudgetManagement.Repository.Interfaces;

public interface IAttachmentRepository : IBaseRepository<Attachment>
{
    Task<IEnumerable<Attachment>> GetByUserAsync(int userId);
    Task<IEnumerable<Attachment>> GetByAttachableAsync(int userId, string type, int id);
}
