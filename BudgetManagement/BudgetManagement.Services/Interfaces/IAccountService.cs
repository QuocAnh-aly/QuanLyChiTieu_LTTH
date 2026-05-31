using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IAccountService
{
    Task<IEnumerable<AccountDto>> GetAllAsync(int userId);
    Task<PaginatedResult<AccountDto>> GetAllPagedAsync(int userId, int page, int pageSize);
    Task<IEnumerable<AccountDto>> GetByTypeAsync(int userId, int typeId);
    Task<PaginatedResult<AccountDto>> GetByTypePagedAsync(int userId, int typeId, int page, int pageSize);
    Task<AccountDto> GetByIdAsync(int userId, int accountId);
    Task<AccountDto> CreateAsync(int userId, CreateAccountDto request);
    Task<AccountDto> UpdateAsync(int userId, int accountId, UpdateAccountDto request);
    Task<bool> DeleteAsync(int userId, int accountId);

    // Dashboard summary
    Task<WalletSummaryDto> GetWalletSummaryAsync(int userId);
}