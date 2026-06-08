using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IBillService
{
    Task<IEnumerable<BillDto>> GetAllAsync(int userId);
    Task<PaginatedResult<BillDto>> GetAllPagedAsync(int userId, int page, int pageSize);
    Task<BillDto> GetByIdAsync(int userId, int billId);
    Task<BillDto> CreateAsync(int userId, CreateBillDto request);
    Task<BillDto> UpdateAsync(int userId, int billId, UpdateBillDto request);
    Task<bool> DeleteAsync(int userId, int billId);
    Task<BillDto> RescanAsync(int userId, int billId);
    Task<BillDto> PayAsync(int userId, int billId, PayBillDto request);
}
