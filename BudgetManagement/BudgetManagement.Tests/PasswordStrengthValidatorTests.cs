using BudgetManagement.Common;
using FluentAssertions;

namespace BudgetManagement.Tests;

public class PasswordStrengthValidatorTests
{
    // ─── Null / Empty ───────────────────────────────────────────────────────

    [Fact]
    public void Validate_NullPassword_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate(null);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("required"));
    }

    [Fact]
    public void Validate_EmptyPassword_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate("");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("required"));
    }

    [Fact]
    public void Validate_WhitespacePassword_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate("   ");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("required"));
    }

    // ─── Length ─────────────────────────────────────────────────────────────

    [Fact]
    public void Validate_ShorterThanMinLength_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate("Ab1!def");       // 6 chars
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("at least 8"));
    }

    [Fact]
    public void Validate_ExactMinLength_ReturnsSuccess()
    {
        var result = PasswordStrengthValidator.Validate("Abc1!defg");     // 8 chars
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_OverMaxLength_ReturnsFailure()
    {
        var pwd = "Ab1!" + new string('x', 130);           // total 134 > 128
        var result = PasswordStrengthValidator.Validate(pwd);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("not exceed"));
    }

    // ─── Character variety ──────────────────────────────────────────────────

    [Fact]
    public void Validate_MissingUppercase_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate("lowercase1!");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("uppercase"));
    }

    [Fact]
    public void Validate_MissingSpecialChar_ReturnsFailure()
    {
        var result = PasswordStrengthValidator.Validate("NoSpecialChar1");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("special character"));
    }

    // ─── Valid passwords ────────────────────────────────────────────────────

    [Theory]
    [InlineData("StrongPass1!")]
    [InlineData("Abcd1234$%")]
    [InlineData("V3ryStr0ng#Password")]
    [InlineData("P@ssw0rdLongEnough")]
    public void Validate_StrongPassword_ReturnsSuccess(string password)
    {
        var result = PasswordStrengthValidator.Validate(password);
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    // ─── Boundary: just missing upper or special on valid-length password ───

    [Fact]
    public void Validate_OnlyLowercaseAndDigits_ReturnsTwoErrors()
    {
        // Missing uppercase AND special character
        var result = PasswordStrengthValidator.Validate("abcdefgh12345678");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(2);
        result.Errors.Should().Contain(e => e.Contains("uppercase"));
        result.Errors.Should().Contain(e => e.Contains("special character"));
    }

    // ─── Multiple errors at once ────────────────────────────────────────────

    [Fact]
    public void Validate_TooShortAndMissingRequirements_ReturnsAllErrors()
    {
        var result = PasswordStrengthValidator.Validate("a!");    // 2 chars, no uppercase
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("at least 8"));
        result.Errors.Should().Contain(e => e.Contains("uppercase"));
    }

    // ─── Edge: uppercase-only valid-length password missing special ─────────

    [Fact]
    public void Validate_AllUppercaseNoSpecial_ReturnsOnlySpecialError()
    {
        var result = PasswordStrengthValidator.Validate("ALLCAPSNOSPECIAL");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
              .Which.Should().Contain("special character");
    }

    // ─── Verify special characters that ARE accepted ────────────────────────

    [Theory]
    [InlineData("StrongPass1!")]        // exclamation
    [InlineData("StrongPass1@")]        // at sign
    [InlineData("StrongPass1#")]        // hash
    [InlineData("StrongPass1$")]        // dollar
    [InlineData("StrongPass1%")]        // percent
    [InlineData("StrongPass1^")]        // caret
    [InlineData("StrongPass1&")]        // ampersand
    [InlineData("StrongPass1*")]        // asterisk
    [InlineData("StrongPass1(")]        // open paren
    [InlineData("Strong-Pass1")]        // hyphen
    [InlineData("Strong+Pass1")]        // plus
    [InlineData("Strong=Pass1")]        // equals
    [InlineData("Strong{Pass1}")]       // braces
    [InlineData("Strong[Pass1]")]       // brackets
    [InlineData("Strong~Pass1")]        // tilde
    [InlineData("Strong`Pass1")]        // backtick
    public void Validate_ValidSpecialChar_ReturnsSuccess(string password)
    {
        var result = PasswordStrengthValidator.Validate(password);
        result.IsValid.Should().BeTrue();
    }

    // ─── Successful result helpers ──────────────────────────────────────────

    [Fact]
    public void Result_Success_StaticFactory_Works()
    {
        var result = PasswordStrengthValidator.Result.Success();
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void Result_Failure_SingleString_Works()
    {
        var result = PasswordStrengthValidator.Result.Failure("oops");
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle().Which.Should().Be("oops");
    }

    [Fact]
    public void Result_Failure_Enumerable_Works()
    {
        var result = PasswordStrengthValidator.Result.Failure(new[] { "err1", "err2" });
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(2);
    }
}
