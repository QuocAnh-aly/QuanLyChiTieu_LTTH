using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class AttachmentRepository : BaseRepository<Attachment>, IAttachmentRepository
{
    public AttachmentRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<Attachment>> GetByUserAsync(int userId)
        => await _dbSet
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();

    public async Task<IEnumerable<Attachment>> GetByAttachableAsync(int userId, string type, int id)
        => await _dbSet
            .Where(a => a.UserId == userId
                     && a.AttachableType == type
                     && a.AttachableId == id)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();
}
