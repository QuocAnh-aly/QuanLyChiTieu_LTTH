using BudgetManagement.Dto;

namespace BudgetManagement.Services.Interfaces;

public interface IBillService
{
    Task<IEnumerable<BillDto>> GetAllAsync(int userId);
    Task<BillDto> GetByIdAsync(int userId, int billId);
    Task<BillDto> CreateAsync(int userId, CreateBillDto request);
    Task<BillDto> UpdateAsync(int userId, int billId, UpdateBillDto request);
    Task<bool> DeleteAsync(int userId, int billId);
    Task<BillDto> RescanAsync(int userId, int billId);
}
