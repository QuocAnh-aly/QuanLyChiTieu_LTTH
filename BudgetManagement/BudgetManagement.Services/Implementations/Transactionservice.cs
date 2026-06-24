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
    private readonly IBillRepository     _billRepo;

    private const int TypeRevenue = 4;
    private const int TypeExpense = 5;

    public TransactionService(
        IJournalRepository journalRepo,
        IAccountRepository accountRepo,
        IBudgetService budgetService,
        IBillRepository billRepo)
    {
        _journalRepo   = journalRepo;
        _accountRepo   = accountRepo;
        _budgetService = budgetService;
        _billRepo      = billRepo;
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

    public async Task<IEnumerable<TransactionDto>> GetByBudgetAsync(int userId, int budgetId)
    {
        var entries = await _journalRepo.GetByBudgetIdAsync(userId, budgetId);
        return entries.Select(MapToDto);
    }

    public async Task<TransactionDto> GetByIdAsync(int userId, int journalId)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Không tìm thấy giao dịch.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

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
                            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản ghi nợ.");
        var creditAccount = await _accountRepo.GetByIdAsync(request.CreditAccountId)
                            ?? throw new KeyNotFoundException("Không tìm thấy tài khoản ghi có.");

        if (debitAccount.UserId != userId || creditAccount.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        // Chi tiêu có thể được gán vào MỘT ngân sách cụ thể của danh mục đó
        // (một danh mục có thể có nhiều ngân sách). Validate ngân sách thuộc user
        // và đúng danh mục chi tiêu.
        int? budgetId = null;
        if (debitAccount.TypeId == TypeExpense && request.BudgetId is > 0)
        {
            var budget = await _budgetService.GetExpenseBudgetByIdAsync(userId, request.BudgetId.Value);
            if (budget.AccountId != debitAccount.AccountId)
                throw new ArgumentException("Ngân sách được chọn không thuộc danh mục chi tiêu này.");
            budgetId = budget.BudgetId;
        }

        // Tạo journal entry kép
        var entry = new JournalEntry
        {
            UserId          = userId,
            TransactionDate = request.TransactionDate ?? DateTime.UtcNow,
            Description     = request.Description ?? "Unknown",
            Notes           = request.Notes,
            Tags            = request.Tags,
            BillId          = request.BillId,
            BudgetId        = budgetId,
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

        // Cộng khoản chi vào đúng ngân sách đã chọn (nếu có)
        if (budgetId.HasValue)
            await _budgetService.UpdateSpentForBudgetAsync(budgetId.Value, request.Amount);

        return MapToDto(created);
    }

    public async Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Không tìm thấy giao dịch.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        // Cập nhật metadata trước
        await _journalRepo.UpdateEntryAsync(journalId, request.Description, request.Notes, request.Tags, request.TransactionDate);

        var oldAmount = entry.JournalDetails
            .Where(d => (d.Debit ?? 0) > 0)
            .Sum(d => d.Debit ?? 0);
        var newAmount = request.Amount ?? oldAmount;

        // Danh mục chi tiêu của giao dịch (nếu có) — dùng để validate ngân sách gán lại.
        var expenseAccountId = entry.JournalDetails
            .FirstOrDefault(d => (d.Debit ?? 0) > 0 && d.Account?.TypeId == TypeExpense)?.AccountId;

        // Ngân sách đích: mặc định giữ nguyên; request.BudgetId == 0 = bỏ gắn,
        // > 0 = đổi sang ngân sách khác (phải cùng danh mục).
        var oldBudgetId = entry.BudgetId;
        int? newBudgetId = oldBudgetId;
        if (request.BudgetId.HasValue && expenseAccountId.HasValue)
        {
            if (request.BudgetId.Value <= 0)
            {
                newBudgetId = null;
            }
            else
            {
                var budget = await _budgetService.GetExpenseBudgetByIdAsync(userId, request.BudgetId.Value);
                if (budget.AccountId != expenseAccountId.Value)
                    throw new ArgumentException("Ngân sách được chọn không thuộc danh mục chi tiêu này.");
                newBudgetId = budget.BudgetId;
            }
        }

        // Đổi số tiền → cập nhật JournalDetails + balance 2 tài khoản
        var amountChanged = Math.Abs(newAmount - oldAmount) > 0.01m;
        if (amountChanged)
        {
            var delta = newAmount - oldAmount;
            await _journalRepo.UpdateEntryAmountAsync(journalId, newAmount);
            foreach (var detail in entry.JournalDetails)
            {
                var account = await _accountRepo.GetByIdAsync(detail.AccountId);
                if (account is null) continue;

                if ((detail.Debit ?? 0) > 0)
                    await UpdateAccountBalanceAsync(account, delta);
                else if ((detail.Credit ?? 0) > 0)
                    await UpdateAccountBalanceAsync(account, -delta);
            }
        }

        // Điều chỉnh "đã chi" của ngân sách
        if (newBudgetId != oldBudgetId)
        {
            // Đổi/bỏ ngân sách: trừ toàn bộ khỏi ngân sách cũ, cộng toàn bộ vào ngân sách mới.
            if (oldBudgetId.HasValue)
                await _budgetService.UpdateSpentForBudgetAsync(oldBudgetId.Value, -oldAmount);
            if (newBudgetId.HasValue)
                await _budgetService.UpdateSpentForBudgetAsync(newBudgetId.Value, newAmount);
            await _journalRepo.UpdateEntryBudgetAsync(journalId, newBudgetId);
        }
        else if (amountChanged && newBudgetId.HasValue)
        {
            // Cùng ngân sách, chỉ đổi số tiền → áp chênh lệch.
            await _budgetService.UpdateSpentForBudgetAsync(newBudgetId.Value, newAmount - oldAmount);
        }

        // Gán lại hóa đơn định kỳ: null = giữ nguyên, 0 = bỏ gắn, >0 = gắn vào hóa đơn.
        if (request.BillId.HasValue)
        {
            int? newBillId = request.BillId.Value <= 0 ? (int?)null : request.BillId.Value;
            if (newBillId.HasValue)
            {
                var bill = await _billRepo.GetByIdAsync(newBillId.Value);
                if (bill is null || bill.UserId != userId)
                    throw new KeyNotFoundException("Không tìm thấy hóa đơn.");
            }
            if (newBillId != entry.BillId)
                await _journalRepo.UpdateEntryBillAsync(journalId, newBillId);
        }

        var updated = await _journalRepo.GetWithDetailsAsync(journalId);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int userId, int journalId)
    {
        var entry = await _journalRepo.GetWithDetailsAsync(journalId)
                    ?? throw new KeyNotFoundException("Không tìm thấy giao dịch.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        // Điều chỉnh budget: trừ số tiền chi khỏi đúng ngân sách giao dịch đã gán.
        if (entry.BudgetId.HasValue)
        {
            var spent = entry.JournalDetails
                .Where(d => (d.Debit ?? 0) > 0 && d.Account?.TypeId == TypeExpense)
                .Sum(d => d.Debit ?? 0);
            if (spent > 0)
                await _budgetService.UpdateSpentForBudgetAsync(entry.BudgetId.Value, -spent);
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
        BillId          = e.BillId,
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
