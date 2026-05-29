using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository.Implementations;

public class ExchangeRateRepository : BaseRepository<ExchangeRate>, IExchangeRateRepository
{
    public ExchangeRateRepository(BudgetManagementDbContext context) : base(context) { }

    public async Task<IEnumerable<ExchangeRate>> GetByUserAsync(int userId)
        => await _dbSet
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.RateDate)
            .ThenBy(r => r.FromCurrency)
            .ToListAsync();

    public async Task<IEnumerable<ExchangeRate>> GetByPairAsync(int userId, string from, string to)
        => await _dbSet
            .Where(r => r.UserId == userId && r.FromCurrency == from && r.ToCurrency == to)
            .OrderByDescending(r => r.RateDate)
            .ToListAsync();

    public async Task<ExchangeRate?> GetLatestAsync(int userId, string from, string to, DateTime onOrBefore)
        => await _dbSet
            .Where(r => r.UserId == userId
                     && r.FromCurrency == from
                     && r.ToCurrency == to
                     && r.RateDate <= onOrBefore)
            .OrderByDescending(r => r.RateDate)
            .FirstOrDefaultAsync();

    public async Task<ExchangeRate?> GetExactAsync(int userId, string from, string to, DateTime date)
        => await _dbSet.FirstOrDefaultAsync(r =>
            r.UserId == userId &&
            r.FromCurrency == from &&
            r.ToCurrency == to &&
            r.RateDate == date.Date);

    public async Task DeleteByCurrencyAsync(int userId, string code)
        => await _dbSet
            .Where(r => r.UserId == userId &&
                       (r.FromCurrency == code || r.ToCurrency == code))
            .ExecuteDeleteAsync();
}
