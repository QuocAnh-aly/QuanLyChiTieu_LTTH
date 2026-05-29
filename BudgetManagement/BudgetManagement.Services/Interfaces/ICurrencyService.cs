using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface ICurrencyService
{
    Task<IEnumerable<CurrencyDto>> GetAllAsync(int userId);
    Task<CurrencyDto> GetByCodeAsync(int userId, string code);
    Task<CurrencyDto?> GetPrimaryAsync(int userId);
    Task<CurrencyDto> CreateAsync(int userId, CreateCurrencyDto request);
    Task<CurrencyDto> UpdateAsync(int userId, string code, UpdateCurrencyDto request);
    Task<bool> DeleteAsync(int userId, string code);
    Task<CurrencyDto> SetPrimaryAsync(int userId, string code);
    Task<CurrencyDto> EnableAsync(int userId, string code);
    Task<CurrencyDto> DisableAsync(int userId, string code);
}
