using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class ExchangeRateServiceTests
{
    private readonly Mock<IExchangeRateRepository> _rateRepoMock;
    private readonly Mock<ICurrencyRepository> _currencyRepoMock;
    private readonly ExchangeRateService _service;
    private readonly int _userId = 1;

    public ExchangeRateServiceTests()
    {
        _rateRepoMock     = new Mock<IExchangeRateRepository>();
        _currencyRepoMock = new Mock<ICurrencyRepository>();
        _service = new ExchangeRateService(_rateRepoMock.Object, _currencyRepoMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static ExchangeRate MakeRate(int rateId = 1, int userId = 1,
        string from = "USD", string to = "VND", decimal rate = 25450m,
        DateTime? date = null)
    {
        return new ExchangeRate
        {
            RateId       = rateId,
            UserId       = userId,
            FromCurrency = from,
            ToCurrency   = to,
            Rate         = rate,
            RateDate     = date ?? DateTime.Today,
            CreatedAt    = DateTime.UtcNow,
        };
    }

    private static Currency MakeCurrency(string code = "VND", string name = "Vietnamese Dong",
        bool isPrimary = true)
    {
        return new Currency
        {
            CurrencyId    = code.GetHashCode(),
            UserId        = 1,
            Code          = code,
            Name          = name,
            Symbol        = code == "VND" ? "₫" : "$",
            DecimalPlaces = 2,
            IsEnabled     = true,
            IsPrimary     = isPrimary,
            CreatedAt     = DateTime.UtcNow,
        };
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllRates()
    {
        var rates = new[] { MakeRate(1), MakeRate(2, from: "EUR", to: "VND", rate: 27600m) };
        _rateRepoMock.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(rates);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().FromCurrency.Should().Be("USD");
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmpty()
    {
        _rateRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<ExchangeRate>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetByPairAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetByPairAsync_NormalizesCodes()
    {
        var rates = new[] { MakeRate(1) };
        _rateRepoMock
            .Setup(r => r.GetByPairAsync(_userId, "USD", "VND"))
            .ReturnsAsync(rates);

        var result = await _service.GetByPairAsync(_userId, "usd", "vnd");

        result.Should().ContainSingle();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesRate()
    {
        var request = new CreateExchangeRateDto
        {
            FromCurrency = "USD",
            ToCurrency   = "VND",
            Rate         = 25450m,
        };

        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD"))
            .ReturnsAsync(MakeCurrency("USD", isPrimary: false));
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "VND"))
            .ReturnsAsync(MakeCurrency("VND", isPrimary: true));
        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>()))
            .ReturnsAsync((ExchangeRate r) => r);

        var result = await _service.CreateAsync(_userId, request);

        result.FromCurrency.Should().Be("USD");
        result.ToCurrency.Should().Be("VND");
        result.Rate.Should().Be(25450m);
    }

    [Fact]
    public async Task CreateAsync_SameCurrency_ThrowsArgumentException()
    {
        var request = new CreateExchangeRateDto
        {
            FromCurrency = "USD",
            ToCurrency   = "usd",
            Rate         = 1m,
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_NegativeRate_ThrowsArgumentException()
    {
        var request = new CreateExchangeRateDto
        {
            FromCurrency = "USD",
            ToCurrency   = "VND",
            Rate         = -1m,
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_ExistingRateOnDate_UpdatesInstead()
    {
        var existing = MakeRate(rate: 25000m);
        var request = new CreateExchangeRateDto
        {
            FromCurrency = "usd",
            ToCurrency   = "vnd",
            Rate         = 25450m,
        };

        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD"))
            .ReturnsAsync(MakeCurrency("USD", isPrimary: false));
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "VND"))
            .ReturnsAsync(MakeCurrency("VND", isPrimary: true));
        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync(existing);
        _rateRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<ExchangeRate>()))
            .ReturnsAsync((ExchangeRate r) => r);

        var result = await _service.CreateAsync(_userId, request);

        result.Rate.Should().Be(25450m);  // updated from 25000
    }

    [Fact]
    public async Task CreateAsync_NonExistentCurrency_ThrowsKeyNotFound()
    {
        var request = new CreateExchangeRateDto
        {
            FromCurrency = "XYZ",
            ToCurrency   = "VND",
            Rate         = 100m,
        };

        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "XYZ"))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnRate_UpdatesFields()
    {
        var existing = MakeRate(1);
        _rateRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _rateRepoMock.Setup(r => r.UpdateAsync(It.IsAny<ExchangeRate>()))
            .ReturnsAsync((ExchangeRate r) => r);

        var result = await _service.UpdateAsync(_userId, 1, new UpdateExchangeRateDto
        {
            Rate = 26000m,
        });

        result.Rate.Should().Be(26000m);
    }

    [Fact]
    public async Task UpdateAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeRate(1, userId: 99);
        _rateRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateExchangeRateDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnRate_DeletesSuccessfully()
    {
        var existing = MakeRate(1);
        _rateRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _rateRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
    }

    // ─── ConvertAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task ConvertAsync_SameCurrency_ReturnsIdentity()
    {
        var result = await _service.ConvertAsync(_userId, 100m, "VND", "vnd", null);

        result.Amount.Should().Be(100m);
        result.Result.Should().Be(100m);
        result.Rate.Should().Be(1m);
    }

    [Fact]
    public async Task ConvertAsync_DirectRateExists_UsesIt()
    {
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync(MakeRate(rate: 25450m));

        var result = await _service.ConvertAsync(_userId, 100m, "usd", "vnd", null);

        result.Result.Should().Be(2_545_000m);  // 100 * 25450
        result.Rate.Should().Be(25450m);
    }

    [Fact]
    public async Task ConvertAsync_InverseRate_CalculatesCorrectly()
    {
        // No direct USD→VND, but VND→USD exists
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "VND", "USD", DateTime.Today))
            .ReturnsAsync(MakeRate(from: "VND", to: "USD", rate: 0.00003929m));

        _currencyRepoMock
            .Setup(r => r.GetPrimaryAsync(_userId))
            .ReturnsAsync(MakeCurrency("VND", isPrimary: true));

        // Via primary: VND is primary, so USD→VND via inverse = 1/0.00003929
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "VND", "USD", DateTime.Today))
            .ReturnsAsync(MakeRate(from: "VND", to: "USD", rate: 0.00003929m));

        var result = await _service.ConvertAsync(_userId, 100m, "usd", "vnd", null);

        result.Result.Should().BeApproximately(2545177m, 1m);  // floating-point variance across platforms
    }

    [Fact]
    public async Task ConvertAsync_NoRate_ThrowsInvalidOperation()
    {
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.GetLatestAsync(_userId, "VND", "USD", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _currencyRepoMock
            .Setup(r => r.GetPrimaryAsync(_userId))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() =>
            _service.ConvertAsync(_userId, 100m, "usd", "vnd", null))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    // ─── BulkUpsertAgainstPrimaryAsync ──────────────────────────────────────

    [Fact]
    public async Task BulkUpsertAgainstPrimaryAsync_UpsertsMultipleRates()
    {
        var request = new BulkRatesDto
        {
            Rates = new Dictionary<string, decimal>
            {
                { "USD", 25450m },
                { "EUR", 27600m },
            },
        };

        _currencyRepoMock
            .Setup(r => r.GetPrimaryAsync(_userId))
            .ReturnsAsync(MakeCurrency("VND", isPrimary: true));

        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "EUR", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>()))
            .ReturnsAsync((ExchangeRate r) => r);

        var result = await _service.BulkUpsertAgainstPrimaryAsync(_userId, request);

        result.Should().Be(2);
        _rateRepoMock.Verify(r => r.CreateAsync(It.IsAny<ExchangeRate>()), Times.Exactly(2));
    }

    [Fact]
    public async Task BulkUpsertAgainstPrimaryAsync_NoPrimary_ThrowsInvalidOperation()
    {
        _currencyRepoMock
            .Setup(r => r.GetPrimaryAsync(_userId))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() =>
            _service.BulkUpsertAgainstPrimaryAsync(_userId, new BulkRatesDto()))
            .Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task BulkUpsertAgainstPrimaryAsync_SkipsPrimaryAndInvalidCodes()
    {
        var request = new BulkRatesDto
        {
            Rates = new Dictionary<string, decimal>
            {
                { "VND", 1m },       // should be skipped (primary)
                { "",   100m },      // should be skipped (empty)
                { "USD", 25450m },   // should be upserted
            },
        };

        _currencyRepoMock
            .Setup(r => r.GetPrimaryAsync(_userId))
            .ReturnsAsync(MakeCurrency("VND", isPrimary: true));
        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "USD", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);
        _rateRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>()))
            .ReturnsAsync((ExchangeRate r) => r);
        _rateRepoMock
            .Setup(r => r.GetExactAsync(_userId, "", "VND", DateTime.Today))
            .ReturnsAsync((ExchangeRate?)null);

        var result = await _service.BulkUpsertAgainstPrimaryAsync(_userId, request);

        result.Should().Be(1);  // only USD
    }
}
