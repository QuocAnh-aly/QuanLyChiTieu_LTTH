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
        // Thu nhập: tự tìm hoặc tạo Revenue account theo tên danh mục
        if (!string.IsNullOrWhiteSpace(request.IncomeCategoryName))
        {
            var revenueAcct =
                await _accountRepo.FindByUserAndNameAsync(userId, TypeRevenue, request.IncomeCategoryName)
                ?? await _accountRepo.CreateAsync(new Account
                {
                    UserId    = userId,
                    TypeId    = TypeRevenue,
                    Name      = request.IncomeCategoryName,
                    IconName  = "TrendingUp",
                    Color     = "green",
                    Balance   = 0,
                    IsActive  = true,
                    CreatedAt = DateTime.UtcNow,
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

        await _journalRepo.UpdateEntryAsync(journalId, request.Description, request.TransactionDate);

        var updated = await _journalRepo.GetWithDetailsAsync(journalId);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int userId, int journalId)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Transaction not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Access denied.");

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
        // typeId 2,3,4 (Liabilities, Equity, Revenue): credit = tăng
        var normalBalanceFactor = account.TypeId is 1 or 5 ? 1 : -1;
        await _accountRepo.UpdateBalanceAsync(account.AccountId, delta * normalBalanceFactor);
    }

    private static TransactionDto MapToDto(JournalEntry e) => new()
    {
        JournalId       = e.JournalId,
        TransactionDate = e.TransactionDate,
        Description     = e.Description,
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