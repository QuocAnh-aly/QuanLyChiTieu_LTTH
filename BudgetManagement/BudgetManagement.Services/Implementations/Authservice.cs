using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BudgetManagement.Common;
using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BudgetManagement.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IConfiguration _config;

    public AuthService(IUserRepository userRepo, IAccountRepository accountRepo, IConfiguration config)
    {
        _userRepo = userRepo;
        _accountRepo = accountRepo;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        if (await _userRepo.ExistsAsync(request.Account))
            throw new InvalidOperationException("Username already exists.");

        // Validate password strength
        var passwordCheck = PasswordStrengthValidator.Validate(request.Password);
        if (!passwordCheck.IsValid)
            throw new ArgumentException(string.Join(" ", passwordCheck.Errors));

        var user = new User
        {
            UserAccount   = request.Account,
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(request.Password),
            UserName      = request.UserName ?? request.Account,
            Email         = request.Email,
            AvatarInitials = (request.UserName ?? request.Account)[..Math.Min(2, (request.UserName ?? request.Account).Length)].ToUpper(),
            Theme         = "light",
            Currency      = "VND",
            NotifyEmail   = true,
            NotifyPush    = true,
            NotifySms     = false,
            CreatedAt     = DateTime.UtcNow
        };

        var created = await _userRepo.CreateAsync(user);

        // ─── Tạo các account dựng sẵn (1 income, 1 expense, 1 equity) ────────────────
        // Account_Types: 3: Equity, 4: Revenue (Income), 5: Expense
        await _accountRepo.CreateAsync(new Account { UserId = created.UserId, TypeId = 4, Name = "Thu nhập chính", IconName = "TrendingUp", Color = "green", IsActive = true, CreatedAt = DateTime.UtcNow });
        await _accountRepo.CreateAsync(new Account { UserId = created.UserId, TypeId = 5, Name = "Ăn uống", IconName = "Pizza", Color = "red", IsActive = true, CreatedAt = DateTime.UtcNow });
        await _accountRepo.CreateAsync(new Account { UserId = created.UserId, TypeId = 3, Name = "Initial", IconName = "Scale", Color = "blue", IsActive = true, CreatedAt = DateTime.UtcNow });

        var (accessToken, refreshToken) = GenerateTokens(created);

        return new AuthResponseDto
        {
            AccessToken  = accessToken,
            RefreshToken = refreshToken,
            UserId       = created.UserId,
            UserName     = created.UserName,
            Email        = created.Email
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _userRepo.GetByAccountAsync(request.Account)
                   ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials.");

        var (accessToken, refreshToken) = GenerateTokens(user);

        return new AuthResponseDto
        {
            AccessToken  = accessToken,
            RefreshToken = refreshToken,
            UserId       = user.UserId,
            UserName     = user.UserName,
            Email        = user.Email
        };
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        // Simple implementation: validate refresh token and issue new pair
        var userIdStr = ValidateToken(refreshToken);
        if (userIdStr == null) throw new UnauthorizedAccessException("Invalid refresh token.");

        var user = await _userRepo.GetByIdAsync(int.Parse(userIdStr))
                   ?? throw new UnauthorizedAccessException("User not found.");

        var (accessToken, newRefreshToken) = GenerateTokens(user);

        return new AuthResponseDto
        {
            AccessToken  = accessToken,
            RefreshToken = newRefreshToken,
            UserId       = user.UserId,
            UserName     = user.UserName,
            Email        = user.Email
        };
    }

    public async Task<UserProfileDto> GetProfileAsync(int userId)
    {
        var user = await _userRepo.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto request)
    {
        var user = await _userRepo.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");

        user.UserName       = request.UserName       ?? user.UserName;
        user.Email          = request.Email          ?? user.Email;
        user.AvatarInitials = request.AvatarInitials ?? user.AvatarInitials;
        user.Theme          = request.Theme          ?? user.Theme;
        user.Currency       = request.Currency       ?? user.Currency;
        user.NotifyEmail    = request.NotifyEmail    ?? user.NotifyEmail;
        user.NotifyPush     = request.NotifyPush     ?? user.NotifyPush;
        user.NotifySms      = request.NotifySms      ?? user.NotifySms;

        var updated = await _userRepo.UpdateAsync(user);
        return MapToProfileDto(updated);
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto request)
    {
        var user = await _userRepo.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        // Validate new password strength
        var passwordCheck = PasswordStrengthValidator.Validate(request.NewPassword);
        if (!passwordCheck.IsValid)
            throw new ArgumentException(string.Join(" ", passwordCheck.Errors));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _userRepo.UpdateAsync(user);
        return true;
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private (string Access, string Refresh) GenerateTokens(User user)
    {
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured.");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name,            user.UserAccount),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var access = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(5), // CSV: 4-5h
            signingCredentials: creds
        );

        var refresh = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(2), // CSV: 1-2 ngày
            signingCredentials: creds
        );

        var handler = new JwtSecurityTokenHandler();
        return (handler.WriteToken(access), handler.WriteToken(refresh));
    }

    private string? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _config["Jwt:Key"];
        var key = Encoding.UTF8.GetBytes(jwtKey!);
        try
        {
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            return jwtToken.Claims.First(x => x.Type == ClaimTypes.NameIdentifier).Value;
        }
        catch
        {
            return null;
        }
    }

    private static UserProfileDto MapToProfileDto(User user) => new()
    {
        UserId         = user.UserId,
        Account        = user.UserAccount,
        UserName       = user.UserName,
        Email          = user.Email,
        AvatarInitials = user.AvatarInitials,
        Theme          = user.Theme,
        Currency       = user.Currency,
        NotifyEmail    = user.NotifyEmail,
        NotifyPush     = user.NotifyPush,
        NotifySms      = user.NotifySms,
        CreatedAt      = user.CreatedAt
    };
}