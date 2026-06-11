using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class TransactionService : ITransactionService
{
    private readonly IJournalRepository  _journalRepo;
    private readonly IAccountRepository  _accountRepo;
    private readonly IBudgetService      _budgetService;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public TransactionService(
        IJournalRepository journalRepo,
        IAccountRepository accountRepo,
        IBudgetService budgetService)
    {
        _journalRepo   = journalRepo;
        _accountRepo   = accountRepo;
        _budgetService = budgetService;
        
    }

    public async Task<IEnumerable<TransactionDto>> GetByUserAsync(int userId, int page, int pageSize)
    {
        var entries = await _journalRepo.GetByUserIdAsync(userId, page, pageSize);
        return entries.Select(MapToDto);
    }

    public async Task<IEnumerable<TransactionDto>> GetByDateRangeAsync(int userId, DateTime from, DateTime to)
    {
        var entries = await _journalRepo.GetByDateRangeAsync(userId, from, to);
        return entries.Select(MapToDto);
    }

    public async Task<IEnumerable<TransactionDto>> GetByDateRangeAndAccountAsync(
        int userId, DateTime from, DateTime to, int accountId)
    {
        var entries = await _journalRepo.GetByDateRangeAndAccountAsync(userId, from, to, accountId);
        return entries.Select(MapToDto);
    }

    public async Task<IEnumerable<TransactionDto>> GetByDateRangeAndBudgetAsync(
        int userId, DateTime from, DateTime to, int budgetId)
    {
        var entries = await _journalRepo.GetByDateRangeAndBudgetAsync(userId, from, to, budgetId);
        return entries.Select(MapToDto);
    }

    public async Task<IEnumerable<TransactionDto>> GetByDateRangeAndBudgetWithUntrackedAsync(
        int userId, DateTime from, DateTime to, int budgetId, int accountId)
    {
        var entries = await _journalRepo.GetByDateRangeAndBudgetWithUntrackedAsync(
            userId, from, to, budgetId, accountId);
        return entries.Select(MapToDto);
    }

    public async Task<TransactionDto> GetByIdAsync(int userId, int journalId)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Transaction not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        return MapToDto(entry);
    }

    public async Task<TransactionDto> CreateAsync(int userId, CreateTransactionDto request)
    {
        // Chi tiêu: tìm Expense account — tự động tạo mới nếu chưa tồn tại
        if (!string.IsNullOrWhiteSpace(request.ExpenseCategoryName))
        {
            var expenseAcct = 
                await _accountRepo.GetByIdAsync(request.DebitAccountId)
                ?? await _accountRepo.CreateAsync(new Account
                {
                    UserId        = userId,
                    TypeId        = TypeExpense,
                    Name          = request.ExpenseCategoryName.Trim(),
                    IconName      = "Coffee",
                    Color         = "red",
                    Balance       = 0,
                    CurrencyCode  = "VND",
                    IsActive      = true,
                });
            request.DebitAccountId = expenseAcct.AccountId;
        }

        // Thu nhập: tìm Revenue account có sẵn — CÓ tự động tạo mới
        if (!string.IsNullOrWhiteSpace(request.IncomeCategoryName))
        {
            var revenueAcct = 
                await _accountRepo.GetByIdAsync(request.CreditAccountId)
                ?? await _accountRepo.CreateAsync(new Account
                {
                    UserId        = userId,
                    TypeId        = TypeRevenue,
                    Name          = request.IncomeCategoryName.Trim(),
                    IconName      = "BriefcaseBusiness",
                    Color         = "green",
                    Balance       = 0,
                    CurrencyCode  = "VND",
                    IsActive      = true,
                });
            request.CreditAccountId = revenueAcct.AccountId;
        }

        // Validate cả 2 account thuộc user này
        var debitAccount  = await _accountRepo.GetByIdAsync(request.DebitAccountId)
                            ?? throw new KeyNotFoundException("Debit account not found.");
        var creditAccount = await _accountRepo.GetByIdAsync(request.CreditAccountId)
                            ?? throw new KeyNotFoundException("Credit account not found.");

        if (debitAccount.UserId != userId || creditAccount.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        // Tạo journal entry kép
        var entry = new JournalEntry
        {
            UserId          = userId,
            TransactionDate = request.TransactionDate ?? DateTime.UtcNow,
            Description     = request.Description ?? "Unknown",
            Notes           = request.Notes,
            Tags            = request.Tags,
            BillId          = request.BillId,
            BudgetId        = request.BudgetId,   // Lưu budget được chọn
            CreatedAt       = DateTime.UtcNow
        };

        var details = new List<JournalDetail>
        {
            new() { AccountId = request.DebitAccountId,  Debit  = request.Amount, Credit = 0 },
            new() { AccountId = request.CreditAccountId, Credit = request.Amount, Debit  = 0 }
        };

        var created = await _journalRepo.CreateWithDetailsAsync(entry, details);

        // Cập nhật balance:
        //   Debit  tăng balance cho Assets/Expense, giảm cho Liabilities/Revenue/Equity
        //   Credit ngược lại
        await UpdateAccountBalanceAsync(debitAccount,  +request.Amount);
        await UpdateAccountBalanceAsync(creditAccount, -request.Amount);

        // Nếu debit account là Expense → cập nhật budget spent (chỉ khi có BudgetId)
        if (debitAccount.TypeId == TypeExpense && request.BudgetId.HasValue)
        {
            await _budgetService.UpdateBudgetSpentAsync(request.BudgetId.Value, request.Amount);
        }

        return MapToDto(created);
    }

    public async Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Transaction not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        // Tính số tiền hiện tại trước khi update
        var oldAmount = entry.JournalDetails
            .Where(d => d.Debit > 0)
            .Sum(d => d.Debit ?? 0);

        // Cập nhật metadata trước
        await _journalRepo.UpdateEntryAsync(journalId, request.Description, request.Notes, request.Tags, request.TransactionDate);

        // Nếu có thay đổi số tiền → cập nhật cả details, balance và budget
        if (request.Amount.HasValue && Math.Abs(request.Amount.Value - oldAmount) > 0.01m)
        {
            var delta = request.Amount.Value - oldAmount;

            // Cập nhật số tiền trong JournalDetails
            await _journalRepo.UpdateEntryAmountAsync(journalId, request.Amount.Value);

            // Điều chỉnh balance 2 tài khoản
            foreach (var detail in entry.JournalDetails)
            {
                var account = await _accountRepo.GetByIdAsync(detail.AccountId);
                if (account is null) continue;

                if (detail.Debit > 0)
                    await UpdateAccountBalanceAsync(account, delta);
                else if (detail.Credit > 0)
                    await UpdateAccountBalanceAsync(account, -delta);

                // Điều chỉnh budget nếu là Expense (chỉ khi có BudgetId)
                if (detail.Account?.TypeId == TypeExpense && detail.Debit > 0 && entry.BudgetId.HasValue)
                {
                    await _budgetService.UpdateBudgetSpentAsync(entry.BudgetId.Value, delta);
                }
            }
        }

        // Số tiền sau cùng (sau khi đã cập nhật amount nếu có)
        var effectiveAmount = request.Amount ?? oldAmount;

        // Kiểm tra nếu budget thay đổi
        var oldBudgetId = entry.BudgetId;
        var newBudgetId = request.BudgetId;

        if (newBudgetId != oldBudgetId)
        {
            // 1. Nếu có old budget: xoá số tiền khỏi budget cũ
            if (oldBudgetId.HasValue)
                await _budgetService.UpdateBudgetSpentAsync(oldBudgetId.Value, -effectiveAmount);

            // 2. Nếu có new budget: cộng số tiền vào budget mới
            if (newBudgetId.HasValue)
                await _budgetService.UpdateBudgetSpentAsync(newBudgetId.Value, effectiveAmount);

            // 3. Cập nhật BudgetId đã lưu (kể cả null để xoá)
            await _journalRepo.SetBudgetIdAsync(journalId, newBudgetId);
        }

        var updated = await _journalRepo.GetWithDetailsAsync(journalId);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int userId, int journalId)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Transaction not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        // Điều chỉnh budget: chỉ hoàn trả khi transaction có BudgetId
        foreach (var detail in entry.JournalDetails)
        {
            if (detail.Account?.TypeId == TypeExpense && (detail.Debit ?? 0) > 0 && entry.BudgetId.HasValue)
            {
                await _budgetService.UpdateBudgetSpentAsync(entry.BudgetId.Value, -(detail.Debit ?? 0));
            }
        }

        // Reverse balance trước khi xoá
        foreach (var detail in entry.JournalDetails)
        {
            var account = await _accountRepo.GetByIdAsync(detail.AccountId);
            if (account is null) continue;

            var delta = (detail.Credit ?? 0) - (detail.Debit ?? 0); // ngược lại với lúc tạo
            await UpdateAccountBalanceAsync(account, delta);
        }

        return await _journalRepo.DeleteAsync(journalId);
    }

    public async Task<CashFlowSummaryDto> GetCashFlowAsync(int userId, DateTime from, DateTime to)
    {
        var entries = (await _journalRepo.GetByDateRangeAsync(userId, from, to)).ToList();

        decimal totalIncome  = 0;
        decimal totalExpense = 0;

        foreach (var entry in entries)
        {
            foreach (var detail in entry.JournalDetails)
            {
                if (detail.Account?.TypeId == TypeRevenue)
                    totalIncome  += detail.Credit ?? 0;
                if (detail.Account?.TypeId == TypeExpense)
                    totalExpense += detail.Debit  ?? 0;
            }
        }

        return new CashFlowSummaryDto
        {
            TotalIncome  = totalIncome,
            TotalExpense = totalExpense,
            NetCashFlow  = totalIncome - totalExpense,
            From         = from,
            To           = to
        };
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /// <summary>
    /// Áp dụng nguyên tắc kế toán kép:
    ///   Assets/Expense   → Debit tăng (+), Credit giảm (-)
    ///   Liabilities/Equity/Revenue → Credit tăng (+), Debit giảm (-)
    /// delta dương = debit side, delta âm = credit side
    /// </summary>
    private async Task UpdateAccountBalanceAsync(Account account, decimal delta)
    {
        // typeId 1 (Assets) hoặc 5 (Expense): debit = tăng
        // typeId 2 (Liabilities): cũng debit = tăng vì balance đang âm (nợ)
        // typeId 3,4 (Equity, Revenue): credit = tăng
        var normalBalanceFactor = account.TypeId is 1 or 2 or 5 ? 1 : -1;
        await _accountRepo.UpdateBalanceAsync(account.AccountId, delta * normalBalanceFactor);
    }

    private static TransactionDto MapToDto(JournalEntry e) => new()
    {
        JournalId       = e.JournalId,
        TransactionDate = DateTime.SpecifyKind(e.TransactionDate, DateTimeKind.Utc),
        Description     = e.Description,
        Notes           = e.Notes,
        Tags            = e.Tags,
        BudgetId        = e.BudgetId,
        CreatedAt       = e.CreatedAt,
        Details         = e.JournalDetails.Select(d => new JournalDetailDto
        {
            DetailId    = d.DetailId,
            AccountId   = d.AccountId,
            AccountName = d.Account?.Name,
            TypeId      = d.Account?.TypeId ?? 0,
            Debit       = d.Debit  ?? 0,
            Credit      = d.Credit ?? 0
        }).ToList()
    };
}
