using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public abstract class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly BudgetManagementDbContext _context;
    protected readonly DbSet<T> _dbSet;

    protected BaseRepository(BudgetManagementDbContext context)
    {
        _context = context;
        _dbSet   = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
        => await _dbSet.FindAsync(id);

    public virtual async Task<IEnumerable<T>> GetAllAsync()
        => await _dbSet.ToListAsync();

    public virtual async Task<T> CreateAsync(T entity)
    {
        _dbSet.Add(entity);
        
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<bool> DeleteAsync(int id)
    {
        var entity = await _dbSet.FindAsync(id);
        if (entity is null) return false;

        _dbSet.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}