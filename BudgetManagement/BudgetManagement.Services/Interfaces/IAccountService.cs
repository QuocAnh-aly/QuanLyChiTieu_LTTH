using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IAccountService
{
    Task<IEnumerable<AccountDto>> GetAllAsync(int userId);
    Task<IEnumerable<AccountDto>> GetByTypeAsync(int userId, int typeId);
    Task<AccountDto> GetByIdAsync(int userId, int accountId);
    Task<AccountDto> CreateAsync(int userId, CreateAccountDto request);
    Task<AccountDto> UpdateAsync(int userId, int accountId, UpdateAccountDto request);
    Task<bool> DeleteAsync(int userId, int accountId);

    // Dashboard summary
    Task<WalletSummaryDto> GetWalletSummaryAsync(int userId);
}