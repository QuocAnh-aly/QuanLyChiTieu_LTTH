using System.Security.Claims;
using BudgetManagement.Common;
using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BudgetManagement.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IAccountRepository> _accountRepoMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly AuthService _service;
    private readonly int _userId = 1;

    public AuthServiceTests()
    {
        _userRepoMock    = new Mock<IUserRepository>();
        _accountRepoMock = new Mock<IAccountRepository>();
        _configMock      = new Mock<IConfiguration>();

        // JWT config
        _configMock.Setup(c => c["Jwt:Key"]).Returns("ThisIsADevelopmentKeyThatIsLongEnough123!");
        _configMock.Setup(c => c["Jwt:Issuer"]).Returns("BudgetManagement");
        _configMock.Setup(c => c["Jwt:Audience"]).Returns("BudgetManagement");

        _service = new AuthService(_userRepoMock.Object, _accountRepoMock.Object, _configMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static User MakeUser(int userId = 1, string account = "testuser",
        string? name = "Test User", string? email = "test@example.com")
    {
        return new User
        {
            UserId         = userId,
            UserAccount    = account,
            PasswordHash   = BCrypt.Net.BCrypt.HashPassword("ValidPass1!"),
            UserName       = name,
            Email          = email,
            AvatarInitials = "TU",
            Theme          = "light",
            Currency       = "VND",
            NotifyEmail    = true,
            NotifyPush     = true,
            NotifySms      = false,
            CreatedAt      = DateTime.UtcNow,
        };
    }

    private static RegisterRequestDto MakeRegisterRequest(
        string account = "newuser",
        string password = "StrongPass1!",
        string? name = "New User",
        string? email = "new@example.com")
    {
        return new RegisterRequestDto
        {
            Account  = account,
            Password = password,
            UserName = name,
            Email    = email,
        };
    }

    // ─── RegisterAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_ValidRequest_CreatesUserAndReturnsTokens()
    {
        var request = MakeRegisterRequest();
        _userRepoMock.Setup(r => r.ExistsAsync("newuser")).ReturnsAsync(false);
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => { u.UserId = 42; return u; });
        _accountRepoMock.Setup(r => r.CreateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var result = await _service.RegisterAsync(request);

        result.UserId.Should().Be(42);
        result.UserName.Should().Be("New User");
        result.Email.Should().Be("new@example.com");
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();

        // Verify 3 default accounts were created
        _accountRepoMock.Verify(r => r.CreateAsync(It.Is<Account>(a =>
            a.TypeId == 4 && a.Name == "Thu nhập chính")), Times.Once);
        _accountRepoMock.Verify(r => r.CreateAsync(It.Is<Account>(a =>
            a.TypeId == 5 && a.Name == "Ăn uống")), Times.Once);
        _accountRepoMock.Verify(r => r.CreateAsync(It.Is<Account>(a =>
            a.TypeId == 3 && a.Name == "Initial")), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ThrowsInvalidOperation()
    {
        var request = MakeRegisterRequest();
        _userRepoMock.Setup(r => r.ExistsAsync("newuser")).ReturnsAsync(true);

        await FluentActions.Invoking(() => _service.RegisterAsync(request))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đã tồn tại*");
    }

    [Fact]
    public async Task RegisterAsync_WeakPassword_ThrowsArgumentException()
    {
        var request = MakeRegisterRequest(password: "weak");  // too short, no uppercase, no special
        _userRepoMock.Setup(r => r.ExistsAsync("newuser")).ReturnsAsync(false);

        await FluentActions.Invoking(() => _service.RegisterAsync(request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task RegisterAsync_NoUserName_DefaultsToAccount()
    {
        var request = MakeRegisterRequest(name: null);
        _userRepoMock.Setup(r => r.ExistsAsync("newuser")).ReturnsAsync(false);
        _userRepoMock.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => { u.UserId = 1; return u; });
        _accountRepoMock.Setup(r => r.CreateAsync(It.IsAny<Account>()))
            .ReturnsAsync((Account a) => a);

        var result = await _service.RegisterAsync(request);

        result.UserName.Should().Be("newuser");
    }

    // ─── LoginAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokens()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByAccountAsync("testuser")).ReturnsAsync(user);

        var result = await _service.LoginAsync(new LoginRequestDto
        {
            Account  = "testuser",
            Password = "ValidPass1!",
        });

        result.UserId.Should().Be(1);
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorized()
    {
        var user = MakeUser();  // hashed with "ValidPass1!"
        _userRepoMock.Setup(r => r.GetByAccountAsync("testuser")).ReturnsAsync(user);

        await FluentActions.Invoking(() => _service.LoginAsync(new LoginRequestDto
        {
            Account  = "testuser",
            Password = "WrongPassword1!",
        })).Should().ThrowAsync<UnauthorizedAccessException>()
          .WithMessage("*Sai tên đăng nhập hoặc mật khẩu*");
    }

    [Fact]
    public async Task LoginAsync_NonExistentAccount_ThrowsUnauthorized()
    {
        _userRepoMock.Setup(r => r.GetByAccountAsync("nobody")).ReturnsAsync((User?)null);

        await FluentActions.Invoking(() => _service.LoginAsync(new LoginRequestDto
        {
            Account  = "nobody",
            Password = "AnyPass1!",
        })).Should().ThrowAsync<UnauthorizedAccessException>()
          .WithMessage("*Sai tên đăng nhập hoặc mật khẩu*");
    }

    // ─── RefreshTokenAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ThrowsUnauthorized()
    {
        // Token with wrong key will fail validation
        await FluentActions.Invoking(() =>
            _service.RefreshTokenAsync("invalid_token"))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Phiên đăng nhập không hợp lệ*");
    }

    // ─── GetProfileAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetProfileAsync_ExistingUser_ReturnsProfile()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var result = await _service.GetProfileAsync(1);

        result.UserId.Should().Be(1);
        result.Account.Should().Be("testuser");
        result.UserName.Should().Be("Test User");
        result.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetProfileAsync_NonExistent_ThrowsKeyNotFound()
    {
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        await FluentActions.Invoking(() => _service.GetProfileAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── UpdateProfileAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfileAsync_UpdatesFields()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        var request = new UpdateProfileDto
        {
            UserName    = "Updated Name",
            Email       = "updated@example.com",
            Theme       = "dark",
            Currency    = "USD",
            NotifyEmail = false,
        };

        var result = await _service.UpdateProfileAsync(1, request);

        result.UserName.Should().Be("Updated Name");
        result.Email.Should().Be("updated@example.com");
        result.Theme.Should().Be("dark");
        result.Currency.Should().Be("USD");
        result.NotifyEmail.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateProfileAsync_PartialUpdate_DoesNotOverwriteOthers()
    {
        var user = MakeUser(name: "Original", email: "orig@example.com");
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        var result = await _service.UpdateProfileAsync(1, new UpdateProfileDto
        {
            UserName = "Only Name Changed",
        });

        result.UserName.Should().Be("Only Name Changed");
        result.Email.Should().Be("orig@example.com");  // unchanged
    }

    [Fact]
    public async Task UpdateProfileAsync_NonExistent_ThrowsKeyNotFound()
    {
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        await FluentActions.Invoking(() =>
            _service.UpdateProfileAsync(999, new UpdateProfileDto()))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── ChangePasswordAsync ────────────────────────────────────────────────

    [Fact]
    public async Task ChangePasswordAsync_ValidRequest_ChangesPassword()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepoMock.Setup(r => r.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        var result = await _service.ChangePasswordAsync(1, new ChangePasswordDto
        {
            OldPassword = "ValidPass1!",
            NewPassword = "NewStrongPass1!",
        });

        result.Should().BeTrue();
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongOldPassword_ThrowsUnauthorized()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        await FluentActions.Invoking(() =>
            _service.ChangePasswordAsync(1, new ChangePasswordDto
            {
                OldPassword = "WrongOldPass1!",
                NewPassword = "NewStrongPass1!",
            })).Should().ThrowAsync<UnauthorizedAccessException>()
              .WithMessage("*không đúng*");
    }

    [Fact]
    public async Task ChangePasswordAsync_WeakNewPassword_ThrowsArgumentException()
    {
        var user = MakeUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        await FluentActions.Invoking(() =>
            _service.ChangePasswordAsync(1, new ChangePasswordDto
            {
                OldPassword = "ValidPass1!",
                NewPassword = "weak",
            })).Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ChangePasswordAsync_NonExistentUser_ThrowsKeyNotFound()
    {
        _userRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((User?)null);

        await FluentActions.Invoking(() =>
            _service.ChangePasswordAsync(999, new ChangePasswordDto
            {
                OldPassword = "ValidPass1!",
                NewPassword = "NewStrongPass1!",
            })).Should().ThrowAsync<KeyNotFoundException>();
    }
}
