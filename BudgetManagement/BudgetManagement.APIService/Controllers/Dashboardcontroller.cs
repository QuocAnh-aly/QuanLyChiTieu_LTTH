using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/dashboard")]
[Authorize]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // GET api/dashboard
    [HttpGet]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _dashboardService.GetSummaryAsync(GetUserId());
        return Ok(result);
    }

    // GET api/dashboard/recent?count=5
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecentTransactions([FromQuery] int count = 5)
    {
        var result = await _dashboardService.GetRecentTransactionsAsync(GetUserId(), count);
        return Ok(result);
    }

    // GET api/dashboard/spending?from=2026-01-01&to=2026-01-31
    [HttpGet("spending")]
    public async Task<IActionResult> GetSpendingByCategory(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var now       = DateTime.UtcNow;
        var rangeFrom = from ?? new DateTime(now.Year, now.Month, 1);
        var rangeTo   = to   ?? rangeFrom.AddMonths(1).AddSeconds(-1);

        var result = await _dashboardService.GetSpendingByCategoryAsync(GetUserId(), rangeFrom, rangeTo);
        return Ok(result);
    }

    // GET api/dashboard/trend?months=6
    [HttpGet("trend")]
    public async Task<IActionResult> GetMonthlyTrend([FromQuery] int months = 6)
    {
        var result = await _dashboardService.GetMonthlyTrendAsync(GetUserId(), months);
        return Ok(result);
    }
}