using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class RecurringService : IRecurringService
{
    private readonly IRecurringRepository _recurringRepo;
    private readonly ITransactionService  _transactionService;

    public RecurringService(
        IRecurringRepository recurringRepo,
        ITransactionService transactionService)
    {
        _recurringRepo      = recurringRepo;
        _transactionService = transactionService;
    }

    public async Task<IEnumerable<RecurringDto>> GetByUserAsync(int userId)
    {
        var recurrings = await _recurringRepo.GetByUserIdAsync(userId);
        return recurrings.Select(MapToDto);
    }

    public async Task<PaginatedResult<RecurringDto>> GetByUserPagedAsync(int userId, int page, int pageSize)
    {
        var result = await _recurringRepo.GetByUserIdPagedAsync(userId, page, pageSize);
        return new PaginatedResult<RecurringDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<RecurringDto> GetByIdAsync(int userId, int recurringId)
    {
        var recurring = await _recurringRepo.GetByIdAsync(recurringId)
                        ?? throw new KeyNotFoundException("Không tìm thấy giao dịch định kỳ.");

        if (recurring.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        return MapToDto(recurring);
    }

    public async Task<RecurringDto> CreateAsync(int userId, CreateRecurringDto request)
    {
        var recurring = new RecurringJournal
        {
            UserId          = userId,
            DebitAccountId  = request.DebitAccountId,
            CreditAccountId = request.CreditAccountId,
            Amount          = request.Amount,
            Title           = request.Title,
            Description     = request.Description,
            Frequency       = request.Frequency,
            IntervalValue   = request.IntervalValue ?? 1,
            NextRunDate     = request.NextRunDate,
            IsActive        = true,
            CreatedAt       = DateTime.UtcNow
        };

        var created = await _recurringRepo.CreateAsync(recurring);
        return MapToDto(created);
    }

    public async Task<RecurringDto> UpdateAsync(int userId, int recurringId, UpdateRecurringDto request)
    {
        var recurring = await _recurringRepo.GetByIdAsync(recurringId)
                        ?? throw new KeyNotFoundException("Không tìm thấy giao dịch định kỳ.");

        if (recurring.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        recurring.Title         = request.Title         ?? recurring.Title;
        recurring.Description   = request.Description   ?? recurring.Description;
        recurring.Amount        = request.Amount        ?? recurring.Amount;
        recurring.Frequency     = request.Frequency     ?? recurring.Frequency;
        recurring.IntervalValue = request.IntervalValue ?? recurring.IntervalValue;
        recurring.NextRunDate   = request.NextRunDate   ?? recurring.NextRunDate;
        recurring.IsActive      = request.IsActive      ?? recurring.IsActive;

        var updated = await _recurringRepo.UpdateAsync(recurring);
        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int userId, int recurringId)
    {
        var recurring = await _recurringRepo.GetByIdAsync(recurringId)
                        ?? throw new KeyNotFoundException("Không tìm thấy giao dịch định kỳ.");

        if (recurring.UserId != userId)
            throw new UnauthorizedAccessException("Không có quyền truy cập.");

        return await _recurringRepo.DeleteAsync(recurringId);
    }

    /// <summary>
    /// Gọi từ Background Job (Hosted Service) mỗi ngày.
    /// Tìm tất cả recurring đến hạn → tạo journal entry → cập nhật NextRunDate.
    /// </summary>
    public async Task ProcessDueRecurringsAsync()
    {
        var dueRecurrings = await _recurringRepo.GetDueAsync(DateTime.UtcNow);

        foreach (var recurring in dueRecurrings)
        {
            try
            {
                // Tạo giao dịch thực
                var transaction = await _transactionService.CreateAsync(
                    recurring.UserId,
                    new CreateTransactionDto
                    {
                        DebitAccountId  = recurring.DebitAccountId,
                        CreditAccountId = recurring.CreditAccountId,
                        Amount          = recurring.Amount,
                        Description     = recurring.Description ?? recurring.Title ?? "Giao dịch định kỳ",
                        TransactionDate = DateTime.UtcNow
                    }
                );

                // Ghi lịch sử instance
                await _recurringRepo.AddInstanceAsync(new RecurringInstance
                {
                    RecurringId = recurring.RecurringId,
                    DueDate     = recurring.NextRunDate,
                    Status      = "completed",
                    JournalId   = transaction.JournalId
                });

                // Tính NextRunDate tiếp theo
                recurring.NextRunDate = ComputeNextRunDate(
                    recurring.NextRunDate,
                    recurring.Frequency,
                    recurring.IntervalValue ?? 1
                );

                await _recurringRepo.UpdateAsync(recurring);
            }
            catch
            {
                // Ghi instance thất bại, không dừng vòng lặp
                await _recurringRepo.AddInstanceAsync(new RecurringInstance
                {
                    RecurringId = recurring.RecurringId,
                    DueDate     = recurring.NextRunDate,
                    Status      = "skipped"
                });
            }
        }
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private static DateTime ComputeNextRunDate(DateTime current, string frequency, int interval) =>
        frequency.ToLower() switch
        {
            "daily"   => current.AddDays(interval),
            "weekly"  => current.AddDays(7 * interval),
            "monthly" => current.AddMonths(interval),
            "yearly"  => current.AddYears(interval),
            _         => current.AddMonths(1)
        };

    private static RecurringDto MapToDto(RecurringJournal r) => new()
    {
        RecurringId     = r.RecurringId,
        DebitAccountId  = r.DebitAccountId,
        CreditAccountId = r.CreditAccountId,
        DebitAccountName  = r.DebitAccount?.Name,
        CreditAccountName = r.CreditAccount?.Name,
        Amount          = r.Amount,
        Title           = r.Title,
        Description     = r.Description,
        Frequency       = r.Frequency,
        IntervalValue   = r.IntervalValue ?? 1,
        NextRunDate     = r.NextRunDate,
        IsActive        = r.IsActive ?? true,
        CreatedAt       = r.CreatedAt
    };
}