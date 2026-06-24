using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class AccountServiceTests
{
    private readonly Mock<IAccountRepository> _repoMock;
    private readonly Mock<IBudgetRepository> _budgetRepoMock;
    private readonly Mock<IJournalRepository> _journalRepoMock;
    private readonly Mock<IRecurringRepository> _recurringRepoMock;
    private readonly Mock<ITransactionService> _transactionServiceMock;
    private readonly AccountService _service;
    private readonly int _userId = 1;

    public AccountServiceTests()
    {
        _repoMock = new Mock<IAccountRepository>();
        _budgetRepoMock = new Mock<IBudgetRepository>();
        _journalRepoMock = new Mock<IJournalRepository>();
        _recurringRepoMock = new Mock<IRecurringRepository>();
        _transactionServiceMock = new Mock<ITransactionService>();
        _service = new AccountService(_repoMock.Object, _budgetRepoMock.Object, _journalRepoMock.Object, _recurringRepoMock.Object, _transactionServiceMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Account MakeAccount(int accountId = 1, int userId = 1, int typeId = 1,
        string name = "Test Wallet", decimal balance = 1000m, string currencyCode = "VND")
    {
        return new Account
        {
            AccountId    = accountId,
            UserId       = userId,
            TypeId       = typeId,
            Name         = name,
            IconName     = "Landmark",
            Color        = "blue",
            GradientFrom = "#3b82f6",
            GradientTo   = "#1d4ed8",
            Balance      = balance,
            InitialBalance = balance,
            CardNumber   = "•••• ••••",
            CurrencyCode = currencyCode,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
            AccountType  = new AccountType { TypeId = typeId, TypeName = "Assets" },
        };
    }

    private static AccountDto AssertSuccess(AccountDto dto, string expectedName, decimal expectedBalance)
    {
        dto.Should().NotBeNull();
        dto.Name.Should().Be(expectedName);
        dto.Balance.Should().Be(expectedBalance);
        return dto;
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAccountsForUser()
    {
        var accounts = new[] { MakeAccount(1), MakeAccount(2, name: "Savings") };
        _repoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(accounts);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Name.Should().Be("Test Wallet");
    }

    // ─── GetByTypeAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetByTypeAsync_FiltersByTypeId()
    {
        var accounts = new[] { MakeAccount(typeId: 1), MakeAccount(typeId: 2) };
        _repoMock.Setup(r => r.GetByUserAndTypeAsync(_userId, 1)).ReturnsAsync(new[] { accounts[0] });

        var result = await _service.GetByTypeAsync(_userId, 1);

        result.Should().ContainSingle().Which.TypeId.Should().Be(1);
    }

    // ─── GetAllPagedAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetAllPagedAsync_FirstPage_ReturnsPagedResult()
    {
        var accounts = new[] { MakeAccount(1), MakeAccount(2) };
        _repoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 1, 10))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = accounts.ToList(),
                TotalCount = 2,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetAllPagedAsync(_userId, 1, 10);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(10);
        result.TotalPages.Should().Be(1);
        result.HasPreviousPage.Should().BeFalse();
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllPagedAsync_MultiplePages_CalculatesCorrectly()
    {
        var page2Accounts = new[] { MakeAccount(3, name: "Page2-1"), MakeAccount(4, name: "Page2-2") };
        _repoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 2, 3))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = page2Accounts.ToList(),
                TotalCount = 8,
                Page = 2,
                PageSize = 3,
            });

        var result = await _service.GetAllPagedAsync(_userId, 2, 3);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(8);
        result.TotalPages.Should().Be(3);   // ceiling of 8/3
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task GetAllPagedAsync_LastPage_HasNoNextPage()
    {
        var lastAccount = MakeAccount(8, name: "Last");
        _repoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 3, 3))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = new List<Account> { lastAccount },
                TotalCount = 8,
                Page = 3,
                PageSize = 3,
            });

        var result = await _service.GetAllPagedAsync(_userId, 3, 3);

        result.Items.Should().ContainSingle().Which.Name.Should().Be("Last");
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public async Task GetAllPagedAsync_EmptyResult_ReturnsEmpty()
    {
        _repoMock
            .Setup(r => r.GetByUserIdPagedAsync(_userId, 1, 10))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = new List<Account>(),
                TotalCount = 0,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetAllPagedAsync(_userId, 1, 10);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.HasPreviousPage.Should().BeFalse();
        result.HasNextPage.Should().BeFalse();
    }

    // ─── GetByTypePagedAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetByTypePagedAsync_FiltersByTypeAndReturnsPagedResult()
    {
        var accounts = new[] { MakeAccount(1, typeId: 1), MakeAccount(2, typeId: 1) };
        _repoMock
            .Setup(r => r.GetByUserAndTypePagedAsync(_userId, 1, 1, 10))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = accounts.ToList(),
                TotalCount = 2,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetByTypePagedAsync(_userId, 1, 1, 10);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetByTypePagedAsync_NoMatchingType_ReturnsEmpty()
    {
        _repoMock
            .Setup(r => r.GetByUserAndTypePagedAsync(_userId, 2, 1, 10))
            .ReturnsAsync(new PaginatedResult<Account>
            {
                Items = new List<Account>(),
                TotalCount = 0,
                Page = 1,
                PageSize = 10,
            });

        var result = await _service.GetByTypePagedAsync(_userId, 2, 1, 10);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnAccount_ReturnsDto()
    {
        var account = MakeAccount();
        _repoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(account);

        var result = await _service.GetByIdAsync(_userId, 1);

        AssertSuccess(result, "Test Wallet", 1000m);
    }

    [Fact]
    public async Task GetByIdAsync_OtherUsersAccount_ThrowsUnauthorized()
    {
        var account = MakeAccount(userId: 99);
        _repoMock.Setup(r => r.GetWithDetailsAsync(1)).ReturnsAsync(account);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _repoMock.Setup(r => r.GetWithDetailsAsync(999)).ReturnsAsync((Account?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesAndReturnsDto()
    {
        var request = new CreateAccountDto
        {
            TypeId   = 1,
            Name     = "New Wallet",
            Balance  = 500m,
            CurrencyCode = "USD",
        };
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => { a.AccountId = 42; return a; });

        var result = await _service.CreateAsync(_userId, request);

        result.AccountId.Should().Be(42);
        result.Name.Should().Be("New Wallet");
        result.Balance.Should().Be(500m);
        result.CurrencyCode.Should().Be("USD");

        _repoMock.Verify(r => r.CreateAsync(It.Is<Account>(a =>
            a.UserId == _userId &&
            a.TypeId == 1 &&
            a.Name == "New Wallet" &&
            a.CurrencyCode == "USD"
        )), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_DefaultCurrencyCode_IsUsedWhenNotProvided()
    {
        var request = new CreateAccountDto
        {
            TypeId   = 1,
            Name     = "Default Currency",
            Balance  = 0,
            CurrencyCode = "VND",    // from default in DTO
        };
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var result = await _service.CreateAsync(_userId, request);
        result.CurrencyCode.Should().Be("VND");
    }

    [Fact]
    public async Task CreateAsync_SetsInitialBalanceEqualToBalance()
    {
        var request = new CreateAccountDto { TypeId = 1, Name = "Test", Balance = 999m, CurrencyCode = "VND" };
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var result = await _service.CreateAsync(_userId, request);

        result.InitialBalance.Should().Be(999m);
        result.Balance.Should().Be(999m);
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnAccount_UpdatesFields()
    {
        var existing = MakeAccount();
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var request = new UpdateAccountDto
        {
            Name         = "Renamed",
            CurrencyCode = "USD",
            IsActive     = false,
        };

        var result = await _service.UpdateAsync(_userId, 1, request);

        result.Name.Should().Be("Renamed");
        result.CurrencyCode.Should().Be("USD");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_OtherUsersAccount_ThrowsUnauthorized()
    {
        var existing = MakeAccount(userId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateAccountDto { Name = "Hack" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateAsync_NonExistent_ThrowsKeyNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Account?)null);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 999, new UpdateAccountDto()))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateAsync_NullFields_DontOverwrite()
    {
        var existing = MakeAccount(name: "Original", balance: 500m);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        // Only send IsActive — name/currency should stay
        var result = await _service.UpdateAsync(_userId, 1, new UpdateAccountDto { IsActive = false });

        result.Name.Should().Be("Original");
        result.CurrencyCode.Should().Be("VND");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_Balance_UpdatesBalanceAndShiftsInitialBalance()
    {
        // balance == initialBalance == 1000 ban đầu (MakeAccount)
        var existing = MakeAccount(balance: 1000m);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var result = await _service.UpdateAsync(_userId, 1, new UpdateAccountDto { Balance = 1500m });

        // delta = +500 → cả Balance lẫn InitialBalance dịch chuyển +500 (giữ bất biến sổ cái)
        result.Balance.Should().Be(1500m);
        result.InitialBalance.Should().Be(1500m);
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnAccount_NoBalance_NoTransactions_HardDeletes()
    {
        var existing = MakeAccount(balance: 0);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _journalRepoMock.Setup(r => r.HasTransaction(1)).ReturnsAsync(false);
        _repoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
        _repoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_OwnAccount_WithTransactions_Forced_SoftDeletes()
    {
        var existing = MakeAccount(balance: 0);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _journalRepoMock.Setup(r => r.HasTransaction(1)).ReturnsAsync(true);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Account>())).ReturnsAsync((Account a) => a);

        var result = await _service.DeleteAsync(_userId, 1, force: true);

        // Account kept but deactivated; hard delete must NOT be called.
        result.Should().BeTrue();
        existing.IsActive.Should().BeFalse();
        _repoMock.Verify(r => r.UpdateAsync(It.Is<Account>(a => a.IsActive == false)), Times.Once);
        _repoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_HasBalance_NoTransferTarget_Throws()
    {
        var existing = MakeAccount(balance: 1000m);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _journalRepoMock.Setup(r => r.HasTransaction(1)).ReturnsAsync(false);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 1))
            .Should().ThrowAsync<InvalidOperationException>();

        _repoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_HasTransactions_NoForce_Throws()
    {
        var existing = MakeAccount(balance: 0);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _journalRepoMock.Setup(r => r.HasTransaction(1)).ReturnsAsync(true);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 1))
            .Should().ThrowAsync<InvalidOperationException>();

        _repoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Account>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_HasBalance_WithTransfer_TransfersThenSoftDeletes()
    {
        var existing = MakeAccount(balance: 1000m);
        var target   = MakeAccount(accountId: 2, balance: 0);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(target);
        _journalRepoMock.Setup(r => r.HasTransaction(1)).ReturnsAsync(false);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Account>())).ReturnsAsync((Account a) => a);

        var result = await _service.DeleteAsync(_userId, 1, transferToAccountId: 2, force: true);

        result.Should().BeTrue();
        existing.IsActive.Should().BeFalse();
        // Số dư dương → chuyển từ ví đang xóa (credit) sang ví nhận (debit).
        _transactionServiceMock.Verify(s => s.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d => d.DebitAccountId == 2 && d.CreditAccountId == 1 && d.Amount == 1000m)), Times.Once);
        _repoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_OtherUsersAccount_ThrowsUnauthorized()
    {
        var existing = MakeAccount(userId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();

        _repoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsKeyNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Account?)null);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── GetWalletSummaryAsync ──────────────────────────────────────────────

    [Fact]
    public async Task GetWalletSummaryAsync_CalculatesCorrectly()
    {
        var accounts = new[]
        {
            MakeAccount(accountId: 1, typeId: 1, name: "Checking", balance: 1000m),        // Assets
            MakeAccount(accountId: 2, typeId: 1, name: "Cash",     balance: 500m),          // Assets
            MakeAccount(accountId: 3, typeId: 2, name: "CC Debt",  balance: -200m),         // Liabilities
            MakeAccount(accountId: 4, typeId: 3, name: "Savings",  balance: 3000m),         // Equity
        };
        _repoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(accounts);

        var result = await _service.GetWalletSummaryAsync(_userId);

        result.TotalAssets.Should().Be(1500m);       // 1000 + 500
        result.TotalLiabilities.Should().Be(200m);    // Math.Abs(-200)
        result.TotalSavings.Should().Be(3000m);
        result.NetWorth.Should().Be(4300m);           // 1500 + 3000 - 200
        result.Accounts.Should().HaveCount(4);
    }

    [Fact]
    public async Task GetWalletSummaryAsync_OnlyActiveAccounts_AreCounted()
    {
        var accounts = new[]
        {
            MakeAccount(accountId: 1, typeId: 1, name: "Active", balance: 1000m),
            MakeAccount(accountId: 2, typeId: 1, name: "Closed", balance: 500m),
        };
        accounts[1].IsActive = false;     // closed account
        _repoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(accounts);

        var result = await _service.GetWalletSummaryAsync(_userId);

        result.TotalAssets.Should().Be(1000m);   // only active
    }

    [Fact]
    public async Task GetWalletSummaryAsync_EmptyAccounts_ReturnsZero()
    {
        _repoMock.Setup(r => r.GetByUserIdAsync(_userId)).ReturnsAsync(Array.Empty<Account>());

        var result = await _service.GetWalletSummaryAsync(_userId);

        result.TotalAssets.Should().Be(0);
        result.TotalLiabilities.Should().Be(0);
        result.TotalSavings.Should().Be(0);
        result.NetWorth.Should().Be(0);
        result.Accounts.Should().BeEmpty();
    }

    // ─── ReconcileBalancesAsync ─────────────────────────────────────────────

    [Fact]
    public async Task ReconcileBalancesAsync_BalanceMatchesLedger_NoMismatch()
    {
        // Assets: computed = InitialBalance(1000) + (+1)·Σ(200) = 1200 = stored.
        var acct = MakeAccount(accountId: 1, typeId: 1, balance: 1000m);
        acct.Balance = 1200m;  // khớp với sổ cái
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync(new[] { acct });
        _repoMock.Setup(r => r.GetLedgerSumsAsync(_userId))
            .ReturnsAsync(new Dictionary<int, decimal> { [1] = 200m });

        var result = await _service.ReconcileBalancesAsync(_userId, repair: false);

        result.Checked.Should().Be(1);
        result.MismatchCount.Should().Be(0);
        result.Mismatches.Should().BeEmpty();
        _repoMock.Verify(r => r.UpdateBalanceAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ReconcileBalancesAsync_Mismatch_NoRepair_ReportsButDoesNotFix()
    {
        // computed = 1000 + 200 = 1200; stored = 1000 → diff = -200.
        var acct = MakeAccount(accountId: 1, typeId: 1, balance: 1000m); // Balance=InitialBalance=1000
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync(new[] { acct });
        _repoMock.Setup(r => r.GetLedgerSumsAsync(_userId))
            .ReturnsAsync(new Dictionary<int, decimal> { [1] = 200m });

        var result = await _service.ReconcileBalancesAsync(_userId, repair: false);

        result.MismatchCount.Should().Be(1);
        var item = result.Mismatches.Single();
        item.StoredBalance.Should().Be(1000m);
        item.ComputedBalance.Should().Be(1200m);
        item.Difference.Should().Be(-200m);
        result.Repaired.Should().BeFalse();
        _repoMock.Verify(r => r.UpdateBalanceAsync(It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ReconcileBalancesAsync_Mismatch_Repair_AppliesCorrectingDelta()
    {
        var acct = MakeAccount(accountId: 1, typeId: 1, balance: 1000m);
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync(new[] { acct });
        _repoMock.Setup(r => r.GetLedgerSumsAsync(_userId))
            .ReturnsAsync(new Dictionary<int, decimal> { [1] = 200m });

        var result = await _service.ReconcileBalancesAsync(_userId, repair: true);

        result.Repaired.Should().BeTrue();
        result.MismatchCount.Should().Be(1);
        // delta = computed(1200) - stored(1000) = +200.
        _repoMock.Verify(r => r.UpdateBalanceAsync(1, 200m), Times.Once);
    }

    [Fact]
    public async Task ReconcileBalancesAsync_LiabilityFactor_IsApplied()
    {
        // Liability (type 2): factor +1. InitialBalance(-500) + (+1)·Σ(-300) = -800.
        var acct = MakeAccount(accountId: 9, typeId: 2, balance: -500m); // Balance=InitialBalance=-500
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync(new[] { acct });
        _repoMock.Setup(r => r.GetLedgerSumsAsync(_userId))
            .ReturnsAsync(new Dictionary<int, decimal> { [9] = -300m });

        var result = await _service.ReconcileBalancesAsync(_userId, repair: false);

        result.Mismatches.Single().ComputedBalance.Should().Be(-800m);
    }
}
