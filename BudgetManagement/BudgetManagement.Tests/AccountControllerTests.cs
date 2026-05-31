using System.Security.Claims;
using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using BudgetManagement.APIService.Controllers;
using Moq;
using FluentAssertions;

namespace BudgetManagement.Tests;

public class AccountControllerTests
{
    private readonly Mock<IAccountService> _accountServiceMock;
    private readonly Mock<ITransactionService> _transactionServiceMock;
    private readonly AccountController _controller;
    private readonly int _userId = 1;

    public AccountControllerTests()
    {
        _accountServiceMock = new Mock<IAccountService>();
        _transactionServiceMock = new Mock<ITransactionService>();
        _controller = new AccountController(_accountServiceMock.Object, _transactionServiceMock.Object);

        // Setup HttpContext with user claims for GetUserId()
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, _userId.ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    // ─── POST api/accounts (source account) ─────────────────────────────────

    [Fact]
    public async Task Create_WithSourceAccountId_Liability_CreatesTransaction_DebitSource_CreditNew()
    {
        // Arrange
        var request = new CreateAccountDto
        {
            TypeId = 2,    // Liability
            Name = "Credit Card Debt",
            Balance = 5000m,
            CurrencyCode = "VND",
            SourceAccountId = 10,  // source bank account
        };

        var createdAccount = new AccountDto
        {
            AccountId = 99,
            Name = "Credit Card Debt",
            TypeId = 2,
            Balance = 0,   // balance set to 0 by controller
        };

        _accountServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateAccountDto>()))
            .ReturnsAsync(createdAccount);

        _transactionServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateTransactionDto>()))
            .ReturnsAsync(new TransactionDto { JournalId = 1000 });

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().Be(createdAccount);

        // Verify the account was created with Balance = 0 (SourceAccountId still on request)
        _accountServiceMock.Verify(s => s.CreateAsync(_userId,
            It.Is<CreateAccountDto>(d => d.Balance == 0)), Times.Once);

        // For Liability: Debit = source (bank tăng), Credit = new debt (nợ tăng)
        _transactionServiceMock.Verify(s => s.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d =>
                d.DebitAccountId == 10 &&          // source bank
                d.CreditAccountId == 99 &&          // new debt account
                d.Amount == 5000m                   // original amount
            )), Times.Once);
    }

    [Fact]
    public async Task Create_WithSourceAccountId_Asset_CreatesTransaction_DebitNew_CreditSource()
    {
        // Arrange
        var request = new CreateAccountDto
        {
            TypeId = 1,    // Asset
            Name = "Savings Account",
            Balance = 2000m,
            CurrencyCode = "VND",
            SourceAccountId = 5,  // source bank account
        };

        var createdAccount = new AccountDto
        {
            AccountId = 50,
            Name = "Savings Account",
            TypeId = 1,
            Balance = 0,
        };

        _accountServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateAccountDto>()))
            .ReturnsAsync(createdAccount);

        _transactionServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateTransactionDto>()))
            .ReturnsAsync(new TransactionDto { JournalId = 1001 });

        // Act
        var result = await _controller.Create(request);

        // Assert
        result.Should().BeOfType<CreatedAtActionResult>();

        // For Asset: Debit = new account (tài sản tăng), Credit = source (nguồn giảm)
        _transactionServiceMock.Verify(s => s.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d =>
                d.DebitAccountId == 50 &&           // new asset account
                d.CreditAccountId == 5 &&            // source bank
                d.Amount == 2000m
            )), Times.Once);
    }

    [Fact]
    public async Task Create_WithSourceAccountId_NegativeBalance_UsesAbsoluteValue()
    {
        // Arrange — negative balance should be treated as positive for the transaction
        var request = new CreateAccountDto
        {
            TypeId = 2,
            Name = "Debt",
            Balance = -3000m,   // negative
            CurrencyCode = "VND",
            SourceAccountId = 10,
        };

        _accountServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateAccountDto>()))
            .ReturnsAsync(new AccountDto { AccountId = 77, Balance = 0 });

        _transactionServiceMock
            .Setup(s => s.CreateAsync(_userId, It.IsAny<CreateTransactionDto>()))
            .ReturnsAsync(new TransactionDto());

        // Act
        await _controller.Create(request);

        // Assert — amount should be Abs(-3000) = 3000
        _transactionServiceMock.Verify(s => s.CreateAsync(_userId,
            It.Is<CreateTransactionDto>(d => d.Amount == 3000m)), Times.Once);
    }

    [Fact]
    public async Task Create_WithSourceAccountId_ZeroBalance_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateAccountDto
        {
            TypeId = 1,
            Name = "Zero Account",
            Balance = 0,
            CurrencyCode = "VND",
            SourceAccountId = 10,
        };

        // Act
        var result = await _controller.Create(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        _accountServiceMock.Verify(s => s.CreateAsync(It.IsAny<int>(), It.IsAny<CreateAccountDto>()),
            Times.Never);
        _transactionServiceMock.Verify(s => s.CreateAsync(It.IsAny<int>(), It.IsAny<CreateTransactionDto>()),
            Times.Never);
    }

    [Fact]
    public async Task Create_WithoutSourceAccountId_CreatesNormally()
    {
        // Arrange
        var request = new CreateAccountDto
        {
            TypeId = 1,
            Name = "Normal Wallet",
            Balance = 1000m,
            CurrencyCode = "VND",
            // No SourceAccountId
        };

        var createdAccount = new AccountDto
        {
            AccountId = 30,
            Name = "Normal Wallet",
            Balance = 1000m,
        };

        _accountServiceMock
            .Setup(s => s.CreateAsync(_userId, request))
            .ReturnsAsync(createdAccount);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().Be(createdAccount);

        // Should NOT create a transaction
        _transactionServiceMock.Verify(s => s.CreateAsync(It.IsAny<int>(), It.IsAny<CreateTransactionDto>()),
            Times.Never);
    }

    // ─── GET api/accounts (pagination) ──────────────────────────────────────

    [Fact]
    public async Task GetAll_DefaultParams_UsesPage1PageSize50()
    {
        var pagedResult = new PaginatedResult<AccountDto>
        {
            Items = new List<AccountDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50,
        };

        _accountServiceMock
            .Setup(s => s.GetAllPagedAsync(_userId, 1, 50))
            .ReturnsAsync(pagedResult);

        var result = await _controller.GetAll();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value.Should().BeOfType<PaginatedResult<AccountDto>>().Subject;
        data.Page.Should().Be(1);
        data.PageSize.Should().Be(50);
    }

    [Fact]
    public async Task GetAll_CustomParams_PassesThrough()
    {
        var pagedResult = new PaginatedResult<AccountDto>
        {
            Items = new List<AccountDto>(),
            TotalCount = 0,
            Page = 3,
            PageSize = 20,
        };

        _accountServiceMock
            .Setup(s => s.GetAllPagedAsync(_userId, 3, 20))
            .ReturnsAsync(pagedResult);

        var result = await _controller.GetAll(page: 3, pageSize: 20);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value.Should().BeOfType<PaginatedResult<AccountDto>>().Subject;
        data.Page.Should().Be(3);
        data.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetAll_InvalidPageSize_ClampsToDefault()
    {
        _accountServiceMock
            .Setup(s => s.GetAllPagedAsync(_userId, 1, 50))
            .ReturnsAsync(new PaginatedResult<AccountDto>());

        // pageSize > 100 should be clamped to 50
        await _controller.GetAll(page: 1, pageSize: 200);

        _accountServiceMock.Verify(s => s.GetAllPagedAsync(_userId, 1, 50), Times.Once);
    }

    [Fact]
    public async Task GetAll_ZeroPage_DefaultsToOne()
    {
        _accountServiceMock
            .Setup(s => s.GetAllPagedAsync(_userId, 1, 50))
            .ReturnsAsync(new PaginatedResult<AccountDto>());

        await _controller.GetAll(page: 0, pageSize: 50);

        _accountServiceMock.Verify(s => s.GetAllPagedAsync(_userId, 1, 50), Times.Once);
    }

    // ─── GET api/accounts/type/{typeId} (pagination) ────────────────────────

    [Fact]
    public async Task GetByType_DefaultParams_UsesDefaultPageSize()
    {
        _accountServiceMock
            .Setup(s => s.GetByTypePagedAsync(_userId, 1, 1, 50))
            .ReturnsAsync(new PaginatedResult<AccountDto>());

        var result = await _controller.GetByType(1);

        result.Should().BeOfType<OkObjectResult>();
        _accountServiceMock.Verify(s => s.GetByTypePagedAsync(_userId, 1, 1, 50), Times.Once);
    }

    [Fact]
    public async Task GetByType_CustomParams_PassesThrough()
    {
        _accountServiceMock
            .Setup(s => s.GetByTypePagedAsync(_userId, 2, 2, 10))
            .ReturnsAsync(new PaginatedResult<AccountDto>());

        await _controller.GetByType(2, page: 2, pageSize: 10);

        _accountServiceMock.Verify(s => s.GetByTypePagedAsync(_userId, 2, 2, 10), Times.Once);
    }
}
