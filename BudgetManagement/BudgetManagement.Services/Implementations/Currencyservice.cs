using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class CurrencyService : ICurrencyService
{
    private readonly ICurrencyRepository _currencyRepo;
    private readonly IExchangeRateRepository _rateRepo;

    public CurrencyService(ICurrencyRepository currencyRepo, IExchangeRateRepository rateRepo)
    {
        _currencyRepo = currencyRepo;
        _rateRepo     = rateRepo;
    }

    public async Task<IEnumerable<CurrencyDto>> GetAllAsync(int userId)
    {
        var list = await _currencyRepo.GetByUserAsync(userId);
        return list.Select(MapToDto);
    }

    public async Task<CurrencyDto> GetByCodeAsync(int userId, string code)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");
        return MapToDto(c);
    }

    public async Task<CurrencyDto?> GetPrimaryAsync(int userId)
    {
        var c = await _currencyRepo.GetPrimaryAsync(userId);
        return c is null ? null : MapToDto(c);
    }

    public async Task<CurrencyDto> CreateAsync(int userId, CreateCurrencyDto request)
    {
        var code = request.Code.Trim().ToUpper();
        if (string.IsNullOrEmpty(code))
            throw new ArgumentException("Vui lòng nhập mã tiền tệ.");

        var existing = await _currencyRepo.GetByUserAndCodeAsync(userId, code);
        if (existing is not null)
            throw new InvalidOperationException($"Tiền tệ {code} đã tồn tại.");

        var isFirst = !(await _currencyRepo.GetByUserAsync(userId)).Any();

        var entity = new Currency
        {
            UserId        = userId,
            Code          = code,
            Name          = request.Name.Trim(),
            Symbol        = request.Symbol.Trim(),
            DecimalPlaces = request.DecimalPlaces ?? 2,
            IsEnabled     = true,
            IsPrimary     = isFirst,
            CreatedAt     = DateTime.UtcNow,
        };
        var created = await _currencyRepo.CreateAsync(entity);
        return MapToDto(created);
    }

    public async Task<CurrencyDto> UpdateAsync(int userId, string code, UpdateCurrencyDto request)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");

        c.Name          = request.Name?.Trim()   ?? c.Name;
        c.Symbol        = request.Symbol?.Trim() ?? c.Symbol;
        c.DecimalPlaces = request.DecimalPlaces  ?? c.DecimalPlaces;
        if (request.IsEnabled.HasValue) c.IsEnabled = request.IsEnabled.Value;

        var updated = await _currencyRepo.UpdateAsync(c);
        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int userId, string code)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");
        if (c.IsPrimary == true)
            throw new InvalidOperationException("Không thể xóa tiền tệ chính. Hãy đặt một tiền tệ khác làm chính trước.");

        // Remove all exchange rates touching this currency, then the currency itself.
        await _rateRepo.DeleteByCurrencyAsync(userId, c.Code);
        return await _currencyRepo.DeleteAsync(c.CurrencyId);
    }

    public async Task<CurrencyDto> SetPrimaryAsync(int userId, string code)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");

        await _currencyRepo.ClearPrimaryAsync(userId);
        c.IsPrimary = true;
        c.IsEnabled = true;
        return MapToDto(await _currencyRepo.UpdateAsync(c));
    }

    public async Task<CurrencyDto> EnableAsync(int userId, string code)
        => await SetEnabledAsync(userId, code, true);

    public async Task<CurrencyDto> DisableAsync(int userId, string code)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");
        if (c.IsPrimary == true)
            throw new InvalidOperationException("Không thể tắt tiền tệ chính.");
        c.IsEnabled = false;
        return MapToDto(await _currencyRepo.UpdateAsync(c));
    }

    private async Task<CurrencyDto> SetEnabledAsync(int userId, string code, bool enabled)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code.ToUpper())
                ?? throw new KeyNotFoundException("Không tìm thấy tiền tệ.");
        c.IsEnabled = enabled;
        return MapToDto(await _currencyRepo.UpdateAsync(c));
    }

    private static CurrencyDto MapToDto(Currency c) => new()
    {
        CurrencyId    = c.CurrencyId,
        Code          = c.Code,
        Name          = c.Name,
        Symbol        = c.Symbol,
        DecimalPlaces = c.DecimalPlaces ?? 2,
        IsEnabled     = c.IsEnabled ?? true,
        IsPrimary     = c.IsPrimary ?? false,
    };
}
