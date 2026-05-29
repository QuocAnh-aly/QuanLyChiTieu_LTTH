using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IExchangeRateService
{
    Task<IEnumerable<ExchangeRateDto>> GetAllAsync(int userId);
    Task<IEnumerable<ExchangeRateDto>> GetByPairAsync(int userId, string from, string to);
    Task<ExchangeRateDto> CreateAsync(int userId, CreateExchangeRateDto request);
    Task<ExchangeRateDto> UpdateAsync(int userId, int rateId, UpdateExchangeRateDto request);
    Task<bool> DeleteAsync(int userId, int rateId);
    Task<int> BulkUpsertAgainstPrimaryAsync(int userId, BulkRatesDto request);
    Task<ConvertResultDto> ConvertAsync(int userId, decimal amount, string from, string to, DateTime? date);
}
