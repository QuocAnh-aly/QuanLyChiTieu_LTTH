using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface ITransactionService
{
    Task<IEnumerable<TransactionDto>> GetByUserAsync(int userId, int page, int pageSize);
    Task<IEnumerable<TransactionDto>> GetByDateRangeAsync(int userId, DateTime from, DateTime to);

    // Lấy giao dịch theo khoảng thời gian và tài khoản
    Task<IEnumerable<TransactionDto>> GetByDateRangeAndAccountAsync(
        int userId, DateTime from, DateTime to, int accountId);

    // Lấy giao dịch đã gán cho một ngân sách cụ thể
    Task<IEnumerable<TransactionDto>> GetByBudgetAsync(int userId, int budgetId);

    Task<TransactionDto> GetByIdAsync(int userId, int journalId);

    // Tạo giao dịch kép: debit + credit
    Task<TransactionDto> CreateAsync(int userId, CreateTransactionDto request);
    Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request);
    Task<bool> DeleteAsync(int userId, int journalId);

    // Dashboard
    Task<CashFlowSummaryDto> GetCashFlowAsync(int userId, DateTime from, DateTime to);
}