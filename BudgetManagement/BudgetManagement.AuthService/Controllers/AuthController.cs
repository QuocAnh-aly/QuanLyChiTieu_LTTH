using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.AuthService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : BaseController
{
    // Refresh token được lưu trong cookie HttpOnly (JS không đọc được) thay vì
    // trả về body để client cất vào localStorage. Cookie chỉ gửi tới /api/auth/*.
    private const string RefreshCookieName = "refresh_token";
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(2);

    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService authService, IWebHostEnvironment env)
    {
        _authService = authService;
        _env = env;
    }

    // POST api/auth/signup
    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<IActionResult> Signup([FromBody] RegisterRequestDto request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return OkWithRefreshCookie(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST api/auth/signin
    [HttpPost("signin")]
    [AllowAnonymous]
    public async Task<IActionResult> Signin([FromBody] LoginRequestDto request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return OkWithRefreshCookie(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    // POST api/auth/refresh — refresh token đọc từ cookie HttpOnly.
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto? request = null)
    {
        try
        {
            // Ưu tiên cookie; fallback body để tương thích client cũ.
            var token = Request.Cookies[RefreshCookieName];
            if (string.IsNullOrEmpty(token))
                token = request?.RefreshToken;
            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { message = "Refresh token required" });

            var result = await _authService.RefreshTokenAsync(token);
            return OkWithRefreshCookie(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearRefreshCookie();
            return Unauthorized(new { message = ex.Message });
        }
    }

    // POST api/auth/logout — xóa cookie refresh token.
    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        ClearRefreshCookie();
        return Ok(new { message = "Logged out" });
    }

    // GET api/auth/profile
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var result = await _authService.GetProfileAsync(GetUserId());
        return Ok(result);
    }

    // PUT api/auth/profile
    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
    {
        var result = await _authService.UpdateProfileAsync(GetUserId(), request);
        return Ok(result);
    }

    // PUT api/auth/password
    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
    {
        try
        {
            await _authService.ChangePasswordAsync(GetUserId(), request);
            return Ok(new { message = "Changed successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Cookie helpers ──────────────────────────────────────────────────────

    // Đặt refresh token vào cookie HttpOnly rồi xóa khỏi body trước khi trả về,
    // để token bí mật không bao giờ chạm tới JavaScript của client.
    private IActionResult OkWithRefreshCookie(AuthResponseDto result)
    {
        SetRefreshCookie(result.RefreshToken);
        result.RefreshToken = string.Empty;
        return Ok(result);
    }

    private CookieOptions BuildRefreshCookieOptions(DateTimeOffset expires)
    {
        var isProd = !_env.IsDevelopment();
        return new CookieOptions
        {
            HttpOnly = true,
            // Prod (HTTPS, có thể khác domain) → None+Secure. Dev (http localhost) → Lax.
            Secure   = isProd,
            SameSite = isProd ? SameSiteMode.None : SameSiteMode.Lax,
            Path     = "/api/auth",
            Expires  = expires,
            IsEssential = true,
        };
    }

    private void SetRefreshCookie(string token) =>
        Response.Cookies.Append(
            RefreshCookieName,
            token,
            BuildRefreshCookieOptions(DateTimeOffset.UtcNow.Add(RefreshTokenLifetime)));

    private void ClearRefreshCookie() =>
        Response.Cookies.Append(
            RefreshCookieName,
            string.Empty,
            BuildRefreshCookieOptions(DateTimeOffset.UtcNow.AddDays(-1)));
}
