using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepo;
    private const int DefaultPageSize = 20;

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

    public async Task<PaginatedResult<AccountDto>> GetAllPagedAsync(int userId, int page, int pageSize)
    {
        var result = await _accountRepo.GetByUserIdPagedAsync(userId, page, pageSize);
        return new PaginatedResult<AccountDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<IEnumerable<AccountDto>> GetByTypeAsync(int userId, int typeId)
    {
        var accounts = await _accountRepo.GetByUserAndTypeAsync(userId, typeId);
        return accounts.Select(MapToDto);
    }

    public async Task<PaginatedResult<AccountDto>> GetByTypePagedAsync(int userId, int typeId, int page, int pageSize)
    {
        var result = await _accountRepo.GetByUserAndTypePagedAsync(userId, typeId, page, pageSize);
        return new PaginatedResult<AccountDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
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

    public async Task<WalletSummaryDto> GetWalletSummaryAsync(int userId, int page = 1, int pageSize = 50, string? search = null, string? sortBy = null)
    {
        var allAccounts = (await _accountRepo.GetByUserIdAsync(userId)).ToList();

        // 1. Tính tổng từ FULL list (không filter) để summary luôn chính xác
        var totalAssets = allAccounts
            .Where(a => a.TypeId == TypeAssets && a.IsActive == true)
            .Sum(a => a.Balance ?? 0);

        var totalLiabilities = allAccounts
            .Where(a => a.TypeId == TypeLiabilities && a.IsActive == true)
            .Sum(a => Math.Abs(a.Balance ?? 0));

        var totalSavings = allAccounts
            .Where(a => a.TypeId == TypeEquity && a.IsActive == true)
            .Sum(a => a.Balance ?? 0);

        // 2. Lấy danh sách hiển thị (Assets, Liabilities, Equity)
        var displayAccounts = allAccounts
            .Where(a => a.TypeId is TypeAssets or TypeLiabilities or TypeEquity)
            .ToList();

        // 3. Apply search filter (server-side)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            displayAccounts = displayAccounts
                .Where(a => a.Name.ToLower().Contains(searchLower))
                .ToList();
        }

        // 4. Apply sorting (server-side)
        displayAccounts = sortBy switch
        {
            "balance-desc" => displayAccounts.OrderByDescending(a => a.Balance).ThenBy(a => a.AccountId).ToList(),
            "balance-asc"  => displayAccounts.OrderBy(a => a.Balance).ThenBy(a => a.AccountId).ToList(),
            "name"         => displayAccounts.OrderBy(a => a.Name).ThenBy(a => a.AccountId).ToList(),
            _              => displayAccounts.OrderBy(a => a.TypeId).ThenBy(a => a.Name).ToList(),
        };

        // 5. Map to DTO
        var allDto = displayAccounts.Select(MapToDto).ToList();

        // 6. Paginate cho card grid
        var paginated = allDto
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new WalletSummaryDto
        {
            TotalAssets      = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalSavings     = totalSavings,
            NetWorth         = totalAssets + totalSavings - totalLiabilities,
            AllAccounts      = allDto,
            Accounts         = paginated,
            TotalCount       = allDto.Count,
            Page             = page,
            PageSize         = pageSize
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