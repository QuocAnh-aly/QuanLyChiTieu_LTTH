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
        // Chi tiêu: tìm Expense account có sẵn — KHÔNG tự động tạo mới
        if (request.DebitAccountId <= 0 && !string.IsNullOrWhiteSpace(request.ExpenseCategoryName))
        {
            var expenseAcct = await _accountRepo.FindByUserAndNameAsync(userId, TypeExpense, request.ExpenseCategoryName);
            if (expenseAcct is null)
                throw new ArgumentException($"Danh mục chi tiêu '{request.ExpenseCategoryName}' chưa tồn tại. Hãy tạo danh mục trước khi ghi giao dịch.");
            request.DebitAccountId = expenseAcct.AccountId;
        }

        // Thu nhập: tìm Revenue account có s  ẵn — KHÔNG tự động tạo mới
        if (request.CreditAccountId <= 0 && !string.IsNullOrWhiteSpace(request.IncomeCategoryName))
        {
            var revenueAcct = await _accountRepo.FindByUserAndNameAsync(userId, TypeRevenue, request.IncomeCategoryName);
            if (revenueAcct is null)
                throw new ArgumentException($"Nguồn thu '{request.IncomeCategoryName}' chưa tồn tại. Hãy tạo nguồn thu trước khi ghi giao dịch.");
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

        // Nếu debit account là Expense → cập nhật budget spent
        if (debitAccount.TypeId == TypeExpense)
            await _budgetService.UpdateSpentAmountAsync(debitAccount.AccountId, request.Amount);

        return MapToDto(created);
    }

    public async Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Transaction not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

        // Cập nhật metadata trước
        await _journalRepo.UpdateEntryAsync(journalId, request.Description, request.Notes, request.Tags, request.TransactionDate);

        // Nếu có thay đổi số tiền → cập nhật cả details, balance và budget
        if (request.Amount.HasValue)
        {
            var oldAmount = entry.JournalDetails
                .Where(d => d.Debit > 0)
                .Sum(d => d.Debit ?? 0);

            if (Math.Abs(request.Amount.Value - oldAmount) > 0.01m)
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

                    // Điều chỉnh budget nếu là Expense
                    if (detail.Account?.TypeId == TypeExpense && detail.Debit > 0)
                        await _budgetService.UpdateSpentAmountAsync(detail.AccountId, delta);
                }
            }
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

        // Điều chỉnh budget: trừ số tiền chi khỏi budget (theo chiều ngược lại)
        foreach (var detail in entry.JournalDetails)
        {
            if (detail.Account?.TypeId == TypeExpense && (detail.Debit ?? 0) > 0)
            {
                await _budgetService.UpdateSpentAmountAsync(detail.AccountId, -(detail.Debit ?? 0));
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
        TransactionDate = e.TransactionDate,
        Description     = e.Description,
        Notes           = e.Notes,
        Tags            = e.Tags,
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
