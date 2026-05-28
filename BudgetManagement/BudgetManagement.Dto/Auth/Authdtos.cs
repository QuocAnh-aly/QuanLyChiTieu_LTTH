namespace BudgetManagement.Dto;

using System.Text.Json.Serialization;

// ─── Request ─────────────────────────────────────────────────────────────────

public class RegisterRequestDto
{
    [JsonPropertyName("account")]
    public string Account { get; set; } = null!;
    
    [JsonPropertyName("password")]
    public string Password { get; set; } = null!;
    
    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

public class LoginRequestDto
{
    [JsonPropertyName("account")]
    public string Account { get; set; } = null!;
    
    [JsonPropertyName("password")]
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
    public string OldPassword { get; set; } = null!;
    
    [JsonPropertyName("new_password")]
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