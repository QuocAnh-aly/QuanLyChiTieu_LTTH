using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface ITransactionService
{
    Task<IEnumerable<TransactionDto>> GetByUserAsync(int userId, int page, int pageSize);
    Task<IEnumerable<TransactionDto>> GetByDateRangeAsync(int userId, DateTime from, DateTime to);
    Task<TransactionDto> GetByIdAsync(int userId, int journalId);

    // Tạo giao dịch kép: debit + credit
    Task<TransactionDto> CreateAsync(int userId, CreateTransactionDto request);
    Task<TransactionDto> UpdateAsync(int userId, int journalId, UpdateTransactionDto request);
    Task<bool> DeleteAsync(int userId, int journalId);

    // Dashboard
    Task<CashFlowSummaryDto> GetCashFlowAsync(int userId, DateTime from, DateTime to);
}