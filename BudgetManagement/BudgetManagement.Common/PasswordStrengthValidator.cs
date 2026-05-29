using System.Text.RegularExpressions;

namespace BudgetManagement.Common;

/// <summary>
/// Validates password strength against configurable rules.
/// </summary>
public static class PasswordStrengthValidator
{
    /// <summary>Minimum password length.</summary>
    public const int MinLength = 8;

    /// <summary>Maximum password length.</summary>
    public const int MaxLength = 128;

    /// <summary>
    /// Result of a password strength check.
    /// </summary>
    public sealed record Result
    {
        public bool   IsValid { get; init; }
        public List<string> Errors { get; init; } = [];

        public static Result Success() => new() { IsValid = true };
        public static Result Failure(string error) => new() { Errors = [error] };
        public static Result Failure(IEnumerable<string> errors) => new() { Errors = errors.ToList() };
    }

    /// <summary>
    /// Validates the given password and returns a <see cref="Result"/>.
    /// </summary>
    public static Result Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return Result.Failure("Password is required.");

        var errors = new List<string>();

        // Length
        if (password.Length < MinLength)
            errors.Add($"Password must be at least {MinLength} characters long.");
        if (password.Length > MaxLength)
            errors.Add($"Password must not exceed {MaxLength} characters.");

        // Character variety
        if (!Regex.IsMatch(password, @"[A-Z]"))
            errors.Add("Password must contain at least one uppercase letter.");
        if (!Regex.IsMatch(password, @"[!@#$%^&*()_\-+=.,;:<>?/~`{}[\]|\\]"))
            errors.Add("Password must contain at least one special character (e.g. !@#$%^&*).");

        return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
    }
}
