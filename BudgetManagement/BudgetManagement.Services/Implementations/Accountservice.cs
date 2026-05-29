using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepo;

    // Account_Types IDs (khớp với INSERT trong SQL schema)
    private const int TypeAssets      = 1;
    private const int TypeLiabilities = 2;
    private const int TypeEquity      = 3;
    private const int TypeRevenue     = 4;
    private const int TypeExpense     = 5;

    public AccountService(IAccountRepository accountRepo)
    {
        _accountRepo = accountRepo;
    }

    public async Task<IEnumerable<AccountDto>> GetAllAsync(int userId)
    {
        var accounts = await _accountRepo.GetByUserIdAsync(userId);
        return accounts.Select(MapToDto);
    }

    public async Task<IEnumerable<AccountDto>> GetByTypeAsync(int userId, int typeId)
    {
        var accounts = await _accountRepo.GetByUserAndTypeAsync(userId, typeId);
        return accounts.Select(MapToDto);
    }

    public async Task<AccountDto> GetByIdAsync(int userId, int accountId)
    {
        var account = await _accountRepo.GetWithDetailsAsync(accountId)
                      ?? throw new KeyNotFoundException("Account not found.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return MapToDto(account);
    }

    public async Task<AccountDto> CreateAsync(int userId, CreateAccountDto request)
    {
        var account = new Account
        {
            UserId       = userId,
            TypeId       = request.TypeId,
            Name         = request.Name,
            IconName     = request.IconName     ?? "Landmark",
            Color        = request.Color        ?? "blue",
            GradientFrom = request.GradientFrom ?? "#3b82f6",
            GradientTo   = request.GradientTo   ?? "#1d4ed8",
            Balance        = request.Balance      ?? 0,
            InitialBalance = request.Balance      ?? 0,
            CardNumber     = request.CardNumber   ?? "•••• ••••",
            CurrencyCode = request.CurrencyCode,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow
        };

        var created = await _accountRepo.CreateAsync(account);
        return MapToDto(created);
    }

    public async Task<AccountDto> UpdateAsync(int userId, int accountId, UpdateAccountDto request)
    {
        var account = await _accountRepo.GetByIdAsync(accountId)
                      ?? throw new KeyNotFoundException("Account not found.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        account.Name         = request.Name         ?? account.Name;
        account.IconName     = request.IconName     ?? account.IconName;
        account.Color        = request.Color        ?? account.Color;
        account.GradientFrom = request.GradientFrom ?? account.GradientFrom;
        account.GradientTo   = request.GradientTo   ?? account.GradientTo;
        account.CardNumber     = request.CardNumber     ?? account.CardNumber;
        account.CurrencyCode   = request.CurrencyCode   ?? account.CurrencyCode;
        account.IsActive       = request.IsActive       ?? account.IsActive;

        var updated = await _accountRepo.UpdateAsync(account);
        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int userId, int accountId)
    {
        var account = await _accountRepo.GetByIdAsync(accountId)
                      ?? throw new KeyNotFoundException("Account not found.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return await _accountRepo.DeleteAsync(accountId);
    }

    public async Task<WalletSummaryDto> GetWalletSummaryAsync(int userId)
    {
        var allAccounts = (await _accountRepo.GetByUserIdAsync(userId)).ToList();

        // Tổng Assets (Checking, Business Cash...)
        var totalAssets = allAccounts
            .Where(a => a.TypeId == TypeAssets && a.IsActive == true)
            .Sum(a => a.Balance ?? 0);

        // Tổng Liabilities (Credit Card, Loan...) → balance âm nên lấy Math.Abs
        var totalLiabilities = allAccounts
            .Where(a => a.TypeId == TypeLiabilities && a.IsActive == true)
            .Sum(a => Math.Abs(a.Balance ?? 0));

        // Tổng Savings/Equity
        var totalSavings = allAccounts
            .Where(a => a.TypeId == TypeEquity && a.IsActive == true)
            .Sum(a => a.Balance ?? 0);

        return new WalletSummaryDto
        {
            TotalAssets      = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalSavings     = totalSavings,
            NetWorth         = totalAssets + totalSavings - totalLiabilities,
            Accounts         = allAccounts
                .Where(a => a.TypeId is TypeAssets or TypeLiabilities or TypeEquity)
                .Select(MapToDto)
                .ToList()
        };
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private static AccountDto MapToDto(Account a) => new()
    {
        AccountId    = a.AccountId,
        TypeId       = a.TypeId,
        TypeName     = a.AccountType?.TypeName,
        Name         = a.Name,
        IconName     = a.IconName,
        Color        = a.Color,
        GradientFrom = a.GradientFrom,
        GradientTo   = a.GradientTo,
        Balance        = a.Balance        ?? 0,
        InitialBalance = a.InitialBalance ?? 0,
        CardNumber     = a.CardNumber,
        CurrencyCode = a.CurrencyCode,
        IsActive     = a.IsActive ?? true,
        CreatedAt    = a.CreatedAt
    };
}