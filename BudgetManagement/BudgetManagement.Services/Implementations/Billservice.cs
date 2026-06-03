using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class BillService : IBillService
{
    private readonly IBillRepository _billRepo;

    public BillService(IBillRepository billRepo)
    {
        _billRepo = billRepo;
    }

    public async Task<IEnumerable<BillDto>> GetAllAsync(int userId)
    {
        var bills   = (await _billRepo.GetByUserIdAsync(userId)).ToList();
        var today   = DateTime.Today;

        // Load all linked entries for user in one query
        var linked  = (await _billRepo.GetLinkedEntriesForUserAsync(userId)).ToList();
        var byBill  = linked
            .Where(j => j.BillId.HasValue)
            .GroupBy(j => j.BillId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        return bills.Select(b =>
        {
            var entries = byBill.TryGetValue(b.BillId, out var list) ? list : [];
            return MapToDto(b, today, entries, false);
        });
    }

    public async Task<PaginatedResult<BillDto>> GetAllPagedAsync(int userId, int page, int pageSize)
    {
        var today   = DateTime.Today;
        var linked  = (await _billRepo.GetLinkedEntriesForUserAsync(userId)).ToList();
        var byBill  = linked
            .Where(j => j.BillId.HasValue)
            .GroupBy(j => j.BillId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = await _billRepo.GetByUserIdPagedAsync(userId, page, pageSize);

        return new PaginatedResult<BillDto>
        {
            Items = result.Items.Select(b =>
            {
                var entries = byBill.TryGetValue(b.BillId, out var list) ? list : [];
                return MapToDto(b, today, entries, false);
            }).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<BillDto> GetByIdAsync(int userId, int billId)
    {
        var bill = await _billRepo.GetByIdAsync(billId)
                   ?? throw new KeyNotFoundException("Bill not found.");
        if (bill.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        var entries = (await _billRepo.GetLinkedEntriesAsync(billId)).ToList();
        return MapToDto(bill, DateTime.Today, entries, true);
    }

    public async Task<BillDto> CreateAsync(int userId, CreateBillDto request)
    {
        var bill = new Bill
        {
            UserId        = userId,
            Name          = request.Name.Trim(),
            AmountMin     = request.AmountMin,
            AmountMax     = request.AmountMax,
            Date          = request.Date.Date,
            EndDate       = request.EndDate?.Date,
            ExtensionDate = request.ExtensionDate?.Date,
            RepeatFreq    = request.RepeatFreq,
            Skip          = request.Skip,
            Active        = true,
            Notes         = request.Notes?.Trim(),
            ObjectGroup   = request.ObjectGroup?.Trim(),
            CreatedAt     = DateTime.UtcNow,
        };
        var created = await _billRepo.CreateAsync(bill);
        return MapToDto(created, DateTime.Today, [], false);
    }

    public async Task<BillDto> UpdateAsync(int userId, int billId, UpdateBillDto request)
    {
        var bill = await _billRepo.GetByIdAsync(billId)
                   ?? throw new KeyNotFoundException("Bill not found.");
        if (bill.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        bill.Name          = request.Name?.Trim()          ?? bill.Name;
        bill.AmountMin     = request.AmountMin             ?? bill.AmountMin;
        bill.AmountMax     = request.AmountMax             ?? bill.AmountMax;
        bill.Date          = request.Date?.Date            ?? bill.Date;
        bill.EndDate       = request.EndDate.HasValue       ? request.EndDate.Value.Date : bill.EndDate;
        bill.ExtensionDate = request.ExtensionDate.HasValue ? request.ExtensionDate.Value.Date : bill.ExtensionDate;
        bill.RepeatFreq    = request.RepeatFreq            ?? bill.RepeatFreq;
        bill.Skip          = request.Skip                  ?? bill.Skip;
        bill.Active        = request.Active                ?? bill.Active;
        bill.Notes         = request.Notes?.Trim()         ?? bill.Notes;
        bill.ObjectGroup   = request.ObjectGroup?.Trim()   ?? bill.ObjectGroup;

        var updated = await _billRepo.UpdateAsync(bill);
        var entries = (await _billRepo.GetLinkedEntriesAsync(billId)).ToList();
        return MapToDto(updated, DateTime.Today, entries, false);
    }

    public async Task<bool> DeleteAsync(int userId, int billId)
    {
        var bill = await _billRepo.GetByIdAsync(billId)
                   ?? throw new KeyNotFoundException("Bill not found.");
        if (bill.UserId != userId) throw new UnauthorizedAccessException("Access denied.");

        // Unlink all journal entries first (FK = SET NULL, but explicit clear is safer)
        await _billRepo.UnlinkAllEntriesAsync(billId);
        return await _billRepo.DeleteAsync(billId);
    }

    public async Task<BillDto> RescanAsync(int userId, int billId)
    {
        var bill = await _billRepo.GetByIdAsync(billId)
                   ?? throw new KeyNotFoundException("Bill not found.");
        if (bill.UserId != userId) throw new UnauthorizedAccessException("Access denied.");
        if (!bill.Active) throw new InvalidOperationException("Cannot rescan an inactive bill.");

        await _billRepo.UnlinkAllEntriesAsync(billId);
        await _billRepo.LinkEntriesByAmountAsync(billId, userId, bill.AmountMin, bill.AmountMax);

        var entries = (await _billRepo.GetLinkedEntriesAsync(billId)).ToList();
        return MapToDto(bill, DateTime.Today, entries, false);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private static BillDto MapToDto(Bill b, DateTime today,
        List<JournalEntry> entries, bool includeTransactions)
    {
        var next        = ComputeNextExpectedMatch(b, today);
        var paidStatus  = ComputePaidStatus(b, today, next, entries);
        var periodTxId  = GetCurrentPeriodTransactionId(b, today, next, entries);
        var avgAmount   = (b.AmountMin + b.AmountMax) / 2m;

        var dto = new BillDto
        {
            BillId             = b.BillId,
            Name               = b.Name,
            AmountMin          = b.AmountMin,
            AmountMax          = b.AmountMax,
            AverageAmount      = avgAmount,
            Date               = b.Date,
            EndDate            = b.EndDate,
            ExtensionDate      = b.ExtensionDate,
            RepeatFreq         = b.RepeatFreq,
            Skip               = b.Skip,
            Active             = b.Active,
            Notes              = b.Notes,
            ObjectGroup        = b.ObjectGroup,
            NextExpectedMatch  = next,
            PaidStatus         = paidStatus,
            PaidTransactionId  = periodTxId,
            MatchedCount       = entries.Count,
            CreatedAt          = b.CreatedAt,
        };

        if (includeTransactions)
        {
            dto.MatchedTransactions = entries
                .Select(e => new MatchedTransactionDto
                {
                    JournalId       = e.JournalId,
                    TransactionDate = e.TransactionDate,
                    Description     = e.Description,
                    Amount          = e.JournalDetails?.Sum(d => d.Debit ?? 0) ?? 0m,
                })
                .OrderByDescending(t => t.TransactionDate)
                .ToList();
        }

        return dto;
    }

    private static DateTime? ComputeNextExpectedMatch(Bill b, DateTime today)
    {
        if (!b.Active) return null;
        if (b.EndDate.HasValue && b.EndDate.Value.Date < today) return null;

        var current  = b.Date.Date;
        int interval = b.Skip + 1;

        while (current < today)
            current = AdvanceDate(current, b.RepeatFreq, interval);

        return current;
    }

    private static string ComputePaidStatus(Bill b, DateTime today, DateTime? next,
        List<JournalEntry> entries)
    {
        if (!b.Active) return "inactive";

        if (b.EndDate.HasValue && b.EndDate.Value.Date < today) return "not_expected";

        // Find the most recent expected date ≤ today (period start)
        var periodStart = GetPeriodStart(b, today);
        if (periodStart == null) return "not_expected"; // bill hasn't started yet

        var periodEnd = next ?? AdvanceDate(periodStart.Value, b.RepeatFreq, b.Skip + 1);

        var hasPaid = entries.Any(e =>
            e.TransactionDate.Date >= periodStart.Value.Date &&
            e.TransactionDate.Date < periodEnd.Date);

        return hasPaid ? "paid" : "expected_unpaid";
    }

    private static int GetCurrentPeriodTransactionId(Bill b, DateTime today, DateTime? next,
        List<JournalEntry> entries)
    {
        var periodStart = GetPeriodStart(b, today);
        if (periodStart == null || next == null) return 0;

        var tx = entries.FirstOrDefault(e =>
            e.TransactionDate.Date >= periodStart.Value.Date &&
            e.TransactionDate.Date < next.Value.Date);

        return tx?.JournalId ?? 0;
    }

    private static DateTime? GetPeriodStart(Bill b, DateTime today)
    {
        var current  = b.Date.Date;
        int interval = b.Skip + 1;

        if (current > today) return null;   // hasn't started

        DateTime? periodStart = null;
        while (current <= today)
        {
            periodStart = current;
            current = AdvanceDate(current, b.RepeatFreq, interval);
        }
        return periodStart;
    }

    private static DateTime AdvanceDate(DateTime date, string freq, int times)
        => freq.ToLower() switch
        {
            "daily"     => date.AddDays(times),
            "weekly"    => date.AddDays(7 * times),
            "monthly"   => date.AddMonths(times),
            "quarterly" => date.AddMonths(3 * times),
            "half-year" => date.AddMonths(6 * times),
            "yearly"    => date.AddYears(times),
            _           => date.AddMonths(times),
        };
}
