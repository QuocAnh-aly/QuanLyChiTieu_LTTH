using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/insight")]
[Authorize]
public class InsightController : BaseController
{
    private readonly IInsightService _service;

    public InsightController(IInsightService service) { _service = service; }

    // Helpers to default to "current month" if range omitted
    private static (DateTime from, DateTime to) Resolve(DateTime? from, DateTime? to)
    {
        var now = DateTime.UtcNow;
        var f   = from ?? new DateTime(now.Year, now.Month, 1);
        var t   = to   ?? f.AddMonths(1).AddSeconds(-1);
        return (f, t);
    }

    // ─── Expense ─────────────────────────────────────────────────────────────

    [HttpGet("expense/total")]
    public async Task<IActionResult> ExpenseTotal([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.ExpenseTotalAsync(GetUserId(), f, t));
    }

    [HttpGet("expense/category")]
    public async Task<IActionResult> ExpenseByCategory([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.ExpenseByCategoryAsync(GetUserId(), f, t));
    }

    [HttpGet("expense/tag")]
    public async Task<IActionResult> ExpenseByTag([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.ExpenseByTagAsync(GetUserId(), f, t));
    }

    // ─── Income ──────────────────────────────────────────────────────────────

    [HttpGet("income/total")]
    public async Task<IActionResult> IncomeTotal([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.IncomeTotalAsync(GetUserId(), f, t));
    }

    [HttpGet("income/category")]
    public async Task<IActionResult> IncomeByCategory([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.IncomeByCategoryAsync(GetUserId(), f, t));
    }

    [HttpGet("income/tag")]
    public async Task<IActionResult> IncomeByTag([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.IncomeByTagAsync(GetUserId(), f, t));
    }

    // ─── Monthly trend (income + expense per month) ─────────────────────────
    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var (f, t) = Resolve(from, to);
        return Ok(await _service.MonthlyTrendAsync(GetUserId(), f, t));
    }
}
