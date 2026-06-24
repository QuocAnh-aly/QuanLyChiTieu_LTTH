using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepo;
    private readonly IBudgetRepository _budgetRepo;
    private readonly IJournalRepository _journalRepo;
    private readonly IRecurringRepository _recurringRepo;
    private readonly ITransactionService _transactionService;
    private const int DefaultPageSize = 20;

    // Account_Types IDs (khớp với INSERT trong SQL schema)
    private const int TypeAssets      = 1;
    private const int TypeLiabilities = 2;
    private const int TypeEquity      = 3;
    private const int TypeRevenue     = 4;
    private const int TypeExpense     = 5;

    // Giới hạn độ dài tên tài khoản/danh mục/nguồn thu
    private const int MaxNameLength = 50;

    public AccountService(IAccountRepository accountRepo, IBudgetRepository budgetRepo, IJournalRepository journalRepo, IRecurringRepository recurringRepo, ITransactionService transactionService)
    {
        _accountRepo = accountRepo;
        _budgetRepo = budgetRepo;
        _journalRepo = journalRepo;
        _recurringRepo = recurringRepo;
        _transactionService = transactionService;
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
                      ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        return MapToDto(account);
    }

    public async Task<AccountDto> CreateAsync(int userId, CreateAccountDto request)
    {
        if (!string.IsNullOrWhiteSpace(request.Name) && request.Name.Trim().Length > MaxNameLength)
            throw new ArgumentException($"Tên không được vượt quá {MaxNameLength} ký tự.");

        var account = new Account
        {
            UserId       = userId,
            TypeId       = request.TypeId,
            Name         = request.Name,
            IconName     = request.IconName     ?? "Landmark",
            Color        = request.Color        ?? "blue",
            GradientFrom = request.GradientFrom,
            GradientTo   = request.GradientTo,
            Balance        = request.Balance      ?? 0,
            InitialBalance = request.InitialBalance ?? request.Balance ?? 0,
            CardNumber     = request.CardNumber,
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
                      ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        if (!string.IsNullOrWhiteSpace(request.Name) && request.Name.Trim().Length > MaxNameLength)
            throw new ArgumentException($"Tên không được vượt quá {MaxNameLength} ký tự.");

        account.Name         = request.Name         ?? account.Name;
        account.IconName     = request.IconName     ?? account.IconName;
        account.Color        = request.Color        ?? account.Color;
        account.GradientFrom = request.GradientFrom ?? account.GradientFrom;
        account.GradientTo   = request.GradientTo   ?? account.GradientTo;
        account.CardNumber     = request.CardNumber     ?? account.CardNumber;
        account.CurrencyCode   = request.CurrencyCode   ?? account.CurrencyCode;
        account.IsActive       = request.IsActive       ?? account.IsActive;

        // Chỉnh số dư hiện tại: dịch chuyển cả số dư đầu kỳ một lượng bằng nhau để
        // giữ bất biến sổ cái (Balance = InitialBalance + Σ sổ cái), tránh lệch khi
        // đối soát. Với tài khoản mới tạo (chưa có giao dịch) thì Balance = InitialBalance.
        if (request.Balance.HasValue)
        {
            var delta = request.Balance.Value - (account.Balance ?? 0);
            account.Balance        = request.Balance.Value;
            account.InitialBalance = (account.InitialBalance ?? 0) + delta;
        }

        var updated = await _accountRepo.UpdateAsync(account);
        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int userId, int accountId, int? transferToAccountId = null, bool force = false)
    {
        var account = await _accountRepo.GetByIdAsync(accountId)
                      ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

        if (account.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        // Ví của lợn tiết kiệm không được xóa trực tiếp — phải xóa qua trang Lợn tiết kiệm
        // (xóa lợn sẽ dọn cả ví + lịch sử), tránh để Budget trỏ tới ví không còn tồn tại.
        if (await _budgetRepo.HasSavingsGoalByAccountIdAsync(accountId))
            throw new InvalidOperationException("Đây là ví của lợn tiết kiệm. Vui lòng xóa từ trang Lợn tiết kiệm.");

        var balance = account.Balance ?? 0;
        // Kiểm tra trước khi tạo bất kỳ giao dịch nào (để các điều kiện chặn không gây tác dụng phụ).
        bool hadTransaction = await _journalRepo.HasTransaction(accountId);

        // 1) Còn số dư → bắt buộc chọn ví khác để chuyển số dư trước khi xóa.
        if (balance != 0 && transferToAccountId is null)
            throw new InvalidOperationException("Ví còn số dư. Vui lòng chọn ví khác để chuyển số dư trước khi xóa.");

        // 2) Có giao dịch liên quan → cần xác nhận xử lý dữ liệu giao dịch.
        if (hadTransaction && !force)
            throw new InvalidOperationException("Ví có giao dịch liên quan. Vui lòng xác nhận để tiếp tục (lịch sử giao dịch sẽ được giữ lại).");

        // 3) Chuyển toàn bộ số dư sang ví nhận (nếu còn).
        if (balance != 0)
        {
            var target = await _accountRepo.GetByIdAsync(transferToAccountId!.Value)
                         ?? throw new KeyNotFoundException("Không tìm thấy ví nhận.");
            if (target.UserId != userId)
                throw new UnauthorizedAccessException("Không có quyền truy cập.");
            if (target.AccountId == accountId)
                throw new InvalidOperationException("Ví nhận phải khác ví đang xóa.");

            // Chuyển khoản nội bộ để đưa số dư ví về 0 (double-entry tự cập nhật số dư 2 bên).
            var transfer = new CreateTransactionDto
            {
                Amount          = Math.Abs(balance),
                Description     = $"Chuyển số dư khi xóa ví: {account.Name}",
                TransactionDate = DateTime.UtcNow,
                // balance > 0: tiền đi từ ví đang xóa → ví nhận; balance < 0: ngược lại.
                DebitAccountId  = balance > 0 ? target.AccountId : accountId,
                CreditAccountId = balance > 0 ? accountId : target.AccountId,
            };
            await _transactionService.CreateAsync(userId, transfer);
        }

        // 4) Xóa: nếu đã có giao dịch cũ HOẶC vừa tạo giao dịch chuyển số dư → ẩn ví để giữ sổ cái.
        if (hadTransaction || balance != 0)
        {
            account.IsActive = false;
            var res = await _accountRepo.UpdateAsync(account);
            return res != null;
        }

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

        // 5. Map to DTO + đánh dấu ví lợn tiết kiệm (Budget savings tham chiếu account)
        var savingsAccountIds = (await _budgetRepo.GetSavingsGoalsAsync(userId))
            .Select(b => b.AccountId)
            .ToHashSet();
        var allDto = displayAccounts.Select(MapToDto).ToList();
        foreach (var dto in allDto)
            dto.IsSavingsWallet = savingsAccountIds.Contains(dto.AccountId);

        // 6. Paginate cho card grid (cùng tham chiếu object nên giữ nguyên cờ vừa gán)
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

    public async Task<ReconcileResultDto> ReconcileBalancesAsync(int userId, bool repair)
    {
        var accounts = (await _accountRepo.GetAllByUserAsync(userId)).ToList();
        var sums = await _accountRepo.GetLedgerSumsAsync(userId);

        var result = new ReconcileResultDto { Repaired = repair };

        foreach (var a in accounts)
        {
            result.Checked++;

            // Cùng quy ước với TransactionService: 1/2/5 → +1, 3/4 → −1.
            var factor = a.TypeId is TypeAssets or TypeLiabilities or TypeExpense ? 1 : -1;
            var ledger = sums.TryGetValue(a.AccountId, out var s) ? s : 0m;
            var computed = (a.InitialBalance ?? 0) + factor * ledger;
            var stored = a.Balance ?? 0;
            var diff = stored - computed;

            if (diff == 0) continue;

            result.MismatchCount++;
            result.Mismatches.Add(new ReconcileItemDto
            {
                AccountId       = a.AccountId,
                Name            = a.Name,
                TypeId          = a.TypeId,
                StoredBalance   = stored,
                ComputedBalance = computed,
                Difference      = diff,
            });

            if (repair)
                await _accountRepo.UpdateBalanceAsync(a.AccountId, computed - stored);
        }

        return result;
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