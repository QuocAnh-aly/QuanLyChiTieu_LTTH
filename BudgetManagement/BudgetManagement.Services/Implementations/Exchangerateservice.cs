using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class ExchangeRateService : IExchangeRateService
{
    private readonly IExchangeRateRepository _rateRepo;
    private readonly ICurrencyRepository _currencyRepo;

    public ExchangeRateService(IExchangeRateRepository rateRepo, ICurrencyRepository currencyRepo)
    {
        _rateRepo     = rateRepo;
        _currencyRepo = currencyRepo;
    }

    public async Task<IEnumerable<ExchangeRateDto>> GetAllAsync(int userId)
    {
        var list = await _rateRepo.GetByUserAsync(userId);
        return list.Select(MapToDto);
    }

    public async Task<IEnumerable<ExchangeRateDto>> GetByPairAsync(int userId, string from, string to)
    {
        var list = await _rateRepo.GetByPairAsync(userId, from.ToUpper(), to.ToUpper());
        return list.Select(MapToDto);
    }

    public async Task<ExchangeRateDto> CreateAsync(int userId, CreateExchangeRateDto request)
    {
        var from = request.FromCurrency.Trim().ToUpper();
        var to   = request.ToCurrency.Trim().ToUpper();
        if (from == to)
            throw new ArgumentException("Tiền tệ nguồn và tiền tệ đích phải khác nhau.");
        if (request.Rate <= 0)
            throw new ArgumentException("Tỷ giá phải lớn hơn 0.");

        await EnsureCurrencyExists(userId, from);
        await EnsureCurrencyExists(userId, to);

        var date = (request.RateDate ?? DateTime.Today).Date;
        var existing = await _rateRepo.GetExactAsync(userId, from, to, date);
        if (existing is not null)
        {
            existing.Rate = request.Rate;
            return MapToDto(await _rateRepo.UpdateAsync(existing));
        }

        var entity = new ExchangeRate
        {
            UserId       = userId,
            FromCurrency = from,
            ToCurrency   = to,
            Rate         = request.Rate,
            RateDate     = date,
            CreatedAt    = DateTime.UtcNow,
        };
        return MapToDto(await _rateRepo.CreateAsync(entity));
    }

    public async Task<ExchangeRateDto> UpdateAsync(int userId, int rateId, UpdateExchangeRateDto request)
    {
        var r = await _rateRepo.GetByIdAsync(rateId)
                ?? throw new KeyNotFoundException("Không tìm thấy tỷ giá.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();

        if (request.Rate.HasValue)
        {
            if (request.Rate.Value <= 0) throw new ArgumentException("Tỷ giá phải lớn hơn 0.");
            r.Rate = request.Rate.Value;
        }
        if (request.RateDate.HasValue) r.RateDate = request.RateDate.Value.Date;
        return MapToDto(await _rateRepo.UpdateAsync(r));
    }

    public async Task<bool> DeleteAsync(int userId, int rateId)
    {
        var r = await _rateRepo.GetByIdAsync(rateId)
                ?? throw new KeyNotFoundException("Không tìm thấy tỷ giá.");
        if (r.UserId != userId) throw new UnauthorizedAccessException();
        return await _rateRepo.DeleteAsync(rateId);
    }

    /// <summary>
    /// Upsert a batch of rates against the user's primary currency.
    /// Frontend semantics (SettingsContext): rates[X] = "1 X = rates[X] primaryCurrency".
    /// So we store from_currency=X, to_currency=primary, rate=rates[X].
    /// </summary>
    public async Task<int> BulkUpsertAgainstPrimaryAsync(int userId, BulkRatesDto request)
    {
        var primary = await _currencyRepo.GetPrimaryAsync(userId)
                      ?? throw new InvalidOperationException("Chưa thiết lập tiền tệ chính.");
        var primaryCode = primary.Code;
        var date = (request.RateDate ?? DateTime.Today).Date;

        int upserted = 0;
        foreach (var (rawCode, value) in request.Rates)
        {
            var code = rawCode.Trim().ToUpper();
            if (string.IsNullOrEmpty(code) || code == primaryCode || value <= 0) continue;

            var existing = await _rateRepo.GetExactAsync(userId, code, primaryCode, date);
            if (existing is not null)
            {
                existing.Rate = value;
                await _rateRepo.UpdateAsync(existing);
            }
            else
            {
                await _rateRepo.CreateAsync(new ExchangeRate
                {
                    UserId       = userId,
                    FromCurrency = code,
                    ToCurrency   = primaryCode,
                    Rate         = value,
                    RateDate     = date,
                    CreatedAt    = DateTime.UtcNow,
                });
            }
            upserted++;
        }
        return upserted;
    }

    public async Task<ConvertResultDto> ConvertAsync(int userId, decimal amount, string from, string to, DateTime? date)
    {
        from = from.ToUpper();
        to   = to.ToUpper();

        if (from == to)
            return new ConvertResultDto { From = from, To = to, Amount = amount, Result = amount, Rate = 1m };

        var asOf = (date ?? DateTime.Today).Date;
        var rate = await ResolveRateAsync(userId, from, to, asOf)
                   ?? throw new InvalidOperationException($"No rate available for {from}→{to}.");

        return new ConvertResultDto
        {
            From   = from,
            To     = to,
            Amount = amount,
            Result = decimal.Round(amount * rate, 6),
            Rate   = rate,
        };
    }

    /// <summary>
    /// Walk rate graph through the primary currency if direct rate is missing.
    /// </summary>
    private async Task<decimal?> ResolveRateAsync(int userId, string from, string to, DateTime asOf)
    {
        // 1) direct
        var direct = await _rateRepo.GetLatestAsync(userId, from, to, asOf);
        if (direct is not null) return direct.Rate;

        // 2) inverse
        var inverse = await _rateRepo.GetLatestAsync(userId, to, from, asOf);
        if (inverse is not null && inverse.Rate != 0) return 1m / inverse.Rate;

        // 3) via primary
        var primary = await _currencyRepo.GetPrimaryAsync(userId);
        if (primary is null) return null;

        var fromToPrimary = from == primary.Code
            ? 1m
            : (await _rateRepo.GetLatestAsync(userId, from, primary.Code, asOf))?.Rate
              ?? (1m / (await _rateRepo.GetLatestAsync(userId, primary.Code, from, asOf))?.Rate ?? 0m);

        var primaryToTarget = to == primary.Code
            ? 1m
            : (await _rateRepo.GetLatestAsync(userId, primary.Code, to, asOf))?.Rate
              ?? (1m / (await _rateRepo.GetLatestAsync(userId, to, primary.Code, asOf))?.Rate ?? 0m);

        if (fromToPrimary == 0m || primaryToTarget == 0m) return null;
        return fromToPrimary * primaryToTarget;
    }

    private async Task EnsureCurrencyExists(int userId, string code)
    {
        var c = await _currencyRepo.GetByUserAndCodeAsync(userId, code);
        if (c is null) throw new KeyNotFoundException($"Currency {code} is not registered.");
    }

    private static ExchangeRateDto MapToDto(ExchangeRate r) => new()
    {
        RateId       = r.RateId,
        FromCurrency = r.FromCurrency,
        ToCurrency   = r.ToCurrency,
        Rate         = r.Rate,
        RateDate     = r.RateDate,
    };
}
