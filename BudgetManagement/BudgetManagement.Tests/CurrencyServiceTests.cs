using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class CurrencyServiceTests
{
    private readonly Mock<ICurrencyRepository> _currencyRepoMock;
    private readonly Mock<IExchangeRateRepository> _rateRepoMock;
    private readonly CurrencyService _service;
    private readonly int _userId = 1;

    public CurrencyServiceTests()
    {
        _currencyRepoMock = new Mock<ICurrencyRepository>();
        _rateRepoMock = new Mock<IExchangeRateRepository>();
        _service = new CurrencyService(_currencyRepoMock.Object, _rateRepoMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Currency MakeCurrency(string code = "USD", string name = "US Dollar",
        string symbol = "$", bool isPrimary = false, bool isEnabled = true)
    {
        return new Currency
        {
            CurrencyId    = code.GetHashCode(),
            UserId        = 1,
            Code          = code,
            Name          = name,
            Symbol        = symbol,
            DecimalPlaces = 2,
            IsEnabled     = isEnabled,
            IsPrimary     = isPrimary,
            CreatedAt     = DateTime.UtcNow,
        };
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsCurrenciesForUser()
    {
        var currencies = new[] { MakeCurrency("VND"), MakeCurrency("USD") };
        _currencyRepoMock.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(currencies);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Code.Should().Be("VND");
    }

    // ─── GetByCodeAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetByCodeAsync_Existing_ReturnsCurrency()
    {
        var currency = MakeCurrency("USD");
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD")).ReturnsAsync(currency);

        var result = await _service.GetByCodeAsync(_userId, "usd");   // lowercase input

        result.Code.Should().Be("USD");
        result.Name.Should().Be("US Dollar");
    }

    [Fact]
    public async Task GetByCodeAsync_NonExistent_ThrowsKeyNotFound()
    {
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "XYZ"))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() => _service.GetByCodeAsync(_userId, "XYZ"))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── GetPrimaryAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetPrimaryAsync_HasPrimary_ReturnsIt()
    {
        var primary = MakeCurrency("VND", isPrimary: true);
        _currencyRepoMock.Setup(r => r.GetPrimaryAsync(_userId)).ReturnsAsync(primary);

        var result = await _service.GetPrimaryAsync(_userId);

        result.Should().NotBeNull();
        result!.Code.Should().Be("VND");
        result.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public async Task GetPrimaryAsync_None_ReturnsNull()
    {
        _currencyRepoMock.Setup(r => r.GetPrimaryAsync(_userId)).ReturnsAsync((Currency?)null);

        var result = await _service.GetPrimaryAsync(_userId);

        result.Should().BeNull();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_FirstCurrency_SetsAsPrimary()
    {
        var request = new CreateCurrencyDto { Code = "VND", Name = "Vietnamese Dong", Symbol = "₫" };
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "VND"))
            .ReturnsAsync((Currency?)null);
        _currencyRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<Currency>());   // no currencies = first
        _currencyRepoMock.Setup(r => r.CreateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.CreateAsync(_userId, request);

        result.Code.Should().Be("VND");
        result.IsPrimary.Should().BeTrue();
        result.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SubsequentCurrency_NotPrimary()
    {
        var request = new CreateCurrencyDto { Code = "USD", Name = "US Dollar", Symbol = "$" };
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD"))
            .ReturnsAsync((Currency?)null);
        _currencyRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(new[] { MakeCurrency("VND", isPrimary: true) }); // already have one
        _currencyRepoMock.Setup(r => r.CreateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.CreateAsync(_userId, request);

        result.IsPrimary.Should().BeFalse();
    }

    [Fact]
    public async Task CreateAsync_DuplicateCode_ThrowsInvalidOperation()
    {
        var request = new CreateCurrencyDto { Code = "USD", Name = "US Dollar", Symbol = "$" };
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD"))
            .ReturnsAsync(MakeCurrency("USD"));

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đã tồn tại*");
    }

    [Fact]
    public async Task CreateAsync_EmptyCode_ThrowsArgument()
    {
        var request = new CreateCurrencyDto { Code = "   ", Name = "Bad", Symbol = "?" };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_TrimsAndUppercasesCode()
    {
        var request = new CreateCurrencyDto { Code = "  usd  ", Name = "US Dollar", Symbol = "$" };
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD"))
            .ReturnsAsync((Currency?)null);
        _currencyRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(new[] { MakeCurrency("VND", isPrimary: true) });
        _currencyRepoMock.Setup(r => r.CreateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.CreateAsync(_userId, request);

        result.Code.Should().Be("USD");
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_UpdatesFields()
    {
        var existing = MakeCurrency("USD");
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD")).ReturnsAsync(existing);
        _currencyRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var request = new UpdateCurrencyDto { Name = "US Dollar Updated", IsEnabled = true };

        var result = await _service.UpdateAsync(_userId, "usd", request);

        result.Name.Should().Be("US Dollar Updated");
    }

    [Fact]
    public async Task UpdateAsync_NonExistent_ThrowsKeyNotFound()
    {
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "XYZ"))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, "XYZ", new UpdateCurrencyDto()))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_NonPrimary_DeletesSuccessfully()
    {
        var currency = MakeCurrency("USD");
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD")).ReturnsAsync(currency);
        _currencyRepoMock.Setup(r => r.DeleteAsync(It.IsAny<int>())).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, "usd");

        result.Should().BeTrue();
        _rateRepoMock.Verify(r => r.DeleteByCurrencyAsync(_userId, "USD"), Times.Once);
        _currencyRepoMock.Verify(r => r.DeleteAsync(currency.CurrencyId), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_PrimaryCurrency_ThrowsInvalidOperation()
    {
        var currency = MakeCurrency("VND", isPrimary: true);
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "VND")).ReturnsAsync(currency);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, "VND"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chính*");

        _currencyRepoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsKeyNotFound()
    {
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "ZZZ"))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, "ZZZ"))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── SetPrimaryAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task SetPrimaryAsync_ClearsOtherAndSetsNew()
    {
        var currency = MakeCurrency("USD");
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD")).ReturnsAsync(currency);
        _currencyRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.SetPrimaryAsync(_userId, "usd");

        result.IsPrimary.Should().BeTrue();
        result.IsEnabled.Should().BeTrue();
        _currencyRepoMock.Verify(r => r.ClearPrimaryAsync(_userId), Times.Once);
    }

    [Fact]
    public async Task SetPrimaryAsync_NonExistent_ThrowsKeyNotFound()
    {
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "XXX"))
            .ReturnsAsync((Currency?)null);

        await FluentActions.Invoking(() => _service.SetPrimaryAsync(_userId, "XXX"))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── DisableAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DisableAsync_NonPrimary_Disables()
    {
        var currency = MakeCurrency("USD");
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "USD")).ReturnsAsync(currency);
        _currencyRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.DisableAsync(_userId, "usd");

        result.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task DisableAsync_Primary_ThrowsInvalidOperation()
    {
        var currency = MakeCurrency("VND", isPrimary: true);
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "VND")).ReturnsAsync(currency);

        await FluentActions.Invoking(() => _service.DisableAsync(_userId, "VND"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chính*");
    }

    // ─── EnableAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task EnableAsync_SetsEnabled()
    {
        var currency = MakeCurrency("EUR", isEnabled: false);
        _currencyRepoMock.Setup(r => r.GetByUserAndCodeAsync(_userId, "EUR")).ReturnsAsync(currency);
        _currencyRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Currency>()))
            .ReturnsAsync((Currency c) => c);

        var result = await _service.EnableAsync(_userId, "eur");

        result.IsEnabled.Should().BeTrue();
    }
}
