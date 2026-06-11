using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface ITransactionService
{
    Task<IEnumerable<TransactionDto>> GetByUserAsync(int userId, int page, int pageSize);
    Task<IEnumerable<TransactionDto>> GetByDateRangeAsync(int userId, DateTime from, DateTime to);

    // Lấy giao dịch theo khoảng thời gian và tài khoản
    Task<IEnumerable<TransactionDto>> GetByDateRangeAndAccountAsync(
        int userId, DateTime from, DateTime to, int accountId);

    Task<TransactionDto> GetByIdAsync(int userId, int journalId);

    // Tạo giao dịch kép: debit + credit
    Task<TransactionDto> CreateAsync(int userId, CreateTransactionDto request);
    Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request);
    Task<bool> DeleteAsync(int userId, int journalId);

    // Lấy giao dịch theo budgetId
    Task<IEnumerable<TransactionDto>> GetByDateRangeAndBudgetAsync(
        int userId, DateTime from, DateTime to, int budgetId);

    // Lấy giao dịch của budget + giao dịch chưa gán (BudgetId=null) cùng category
    Task<IEnumerable<TransactionDto>> GetByDateRangeAndBudgetWithUntrackedAsync(
        int userId, DateTime from, DateTime to, int budgetId, int accountId);

    // Dashboard
    Task<CashFlowSummaryDto> GetCashFlowAsync(int userId, DateTime from, DateTime to);
}