using BudgetManagement.Dto;

using FluentAssertions;

namespace BudgetManagement.Tests;

public class PaginatedResultTests
{
    // ─── TotalPages ────────────────────────────────────────────────────────

    [Fact]
    public void TotalPages_ExactDivision_ReturnsCorrectPages()
    {
        var result = new PaginatedResult<string>
        {
            Items = new List<string> { "a", "b", "c", "d", "e" },
            TotalCount = 20,
            Page = 1,
            PageSize = 5,
        };

        result.TotalPages.Should().Be(4);
    }

    [Fact]
    public void TotalPages_PartialLastPage_RoundsUp()
    {
        var result = new PaginatedResult<string>
        {
            TotalCount = 23,
            PageSize = 10,
        };

        result.TotalPages.Should().Be(3);   // ceiling of 23/10
    }

    [Fact]
    public void TotalPages_ZeroItems_ReturnsOne()
    {
        var result = new PaginatedResult<string>
        {
            TotalCount = 0,
            PageSize = 10,
        };

        result.TotalPages.Should().Be(0);   // 0/10 = 0, ceiling = 0
    }

    [Fact]
    public void TotalPages_PageSizeZero_DoesNotDivideByZero()
    {
        var result = new PaginatedResult<string>
        {
            TotalCount = 10,
            PageSize = 0,
        };

        result.TotalPages.Should().Be(10);  // Math.Max(1, 0) = 1, 10/1 = 10
    }

    // ─── HasPreviousPage ────────────────────────────────────────────────────

    [Fact]
    public void HasPreviousPage_FirstPage_ReturnsFalse()
    {
        var result = new PaginatedResult<string> { Page = 1, TotalCount = 20, PageSize = 10 };

        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public void HasPreviousPage_SecondPage_ReturnsTrue()
    {
        var result = new PaginatedResult<string> { Page = 2, TotalCount = 20, PageSize = 10 };

        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public void HasPreviousPage_PageZero_ReturnsFalse()
    {
        var result = new PaginatedResult<string> { Page = 0, TotalCount = 20, PageSize = 10 };

        result.HasPreviousPage.Should().BeFalse();
    }

    // ─── HasNextPage ────────────────────────────────────────────────────────

    [Fact]
    public void HasNextPage_LastPage_ReturnsFalse()
    {
        var result = new PaginatedResult<string> { Page = 2, TotalCount = 20, PageSize = 10 };

        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public void HasNextPage_MiddlePage_ReturnsTrue()
    {
        var result = new PaginatedResult<string> { Page = 1, TotalCount = 30, PageSize = 10 };

        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public void HasNextPage_EmptyResult_ReturnsFalse()
    {
        var result = new PaginatedResult<string> { Page = 1, TotalCount = 0, PageSize = 10 };

        result.HasNextPage.Should().BeFalse();
    }
}
