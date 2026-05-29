namespace BudgetManagement.Dto;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

// ─── Request ─────────────────────────────────────────────────────────────────

public class RefreshTokenRequestDto
{
    [JsonPropertyName("refresh_token")]
    [Required(ErrorMessage = "Refresh token is required")]
    public string RefreshToken { get; set; } = null!;
}

public class RegisterRequestDto
{
    [JsonPropertyName("account")]
    [Required(ErrorMessage = "Account is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Account must be between 3 and 50 characters")]
    [RegularExpression(@"^[a-zA-Z0-9_.@-]+$", ErrorMessage = "Account may only contain letters, numbers, and . _ @ -")]
    public string Account { get; set; } = null!;
    
    [JsonPropertyName("password")]
    [Required(ErrorMessage = "Password is required")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters")]
    public string Password { get; set; } = null!;
    
    [JsonPropertyName("user_name")]
    [StringLength(100, ErrorMessage = "User name cannot exceed 100 characters")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("email")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(200, ErrorMessage = "Email cannot exceed 200 characters")]
    public string? Email { get; set; }
}

public class LoginRequestDto
{
    [JsonPropertyName("account")]
    [Required(ErrorMessage = "Account is required")]
    public string Account { get; set; } = null!;
    
    [JsonPropertyName("password")]
    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = null!;
}

public class UpdateProfileDto
{
    public string? UserName       { get; set; }
    public string? Email          { get; set; }
    public string? AvatarInitials { get; set; }
    public string? Theme          { get; set; }   // "light" | "dark" | "auto"
    public string? Currency       { get; set; }   // "USD" | "VND" ...
    public bool?   NotifyEmail    { get; set; }
    public bool?   NotifyPush     { get; set; }
    public bool?   NotifySms      { get; set; }
}

public class ChangePasswordDto
{
    [JsonPropertyName("old_password")]
    [Required(ErrorMessage = "Current password is required")]
    public string OldPassword { get; set; } = null!;
    
    [JsonPropertyName("new_password")]
    [Required(ErrorMessage = "New password is required")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "New password must be between 8 and 128 characters")]
    public string NewPassword { get; set; } = null!;
}

// ─── Response ────────────────────────────────────────────────────────────────

public class AuthResponseDto
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = null!;
    
    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = null!;
    
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

public class UserProfileDto
{
    public int       UserId         { get; set; }
    public string    Account        { get; set; } = null!;
    public string?   UserName       { get; set; }
    public string?   Email          { get; set; }
    public string?   AvatarInitials { get; set; }
    public string?   Theme          { get; set; }
    public string?   Currency       { get; set; }
    public bool      NotifyEmail    { get; set; }
    public bool      NotifyPush     { get; set; }
    public bool      NotifySms      { get; set; }
    public DateTime? CreatedAt      { get; set; }
}