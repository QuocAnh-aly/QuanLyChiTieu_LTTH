using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/data")]
[Authorize]
public class DataController : BaseController
{
    private readonly IExportService _service;

    public DataController(IExportService service) { _service = service; }

    private static ExportFormat Parse(string? format) => (format?.Trim().ToLowerInvariant()) switch
    {
        "json" => ExportFormat.Json,
        "xlsx" => ExportFormat.Xlsx,
        "excel" => ExportFormat.Xlsx,
        "xls" => ExportFormat.Xlsx,
        _ => ExportFormat.Csv,
    };

    // GET api/data/export/transactions?from=&to=&format=csv|json|xlsx
    [HttpGet("export/transactions")]
    public async Task<IActionResult> ExportTransactions(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? format)
    {
        var (bytes, mime, filename) = await _service.ExportTransactionsAsync(GetUserId(), from, to, Parse(format));
        return File(bytes, mime, filename);
    }

    // GET api/data/export/accounts?format=csv|json|xlsx
    [HttpGet("export/accounts")]
    public async Task<IActionResult> ExportAccounts([FromQuery] string? format)
    {
        var (bytes, mime, filename) = await _service.ExportAccountsAsync(GetUserId(), Parse(format));
        return File(bytes, mime, filename);
    }

    // GET api/data/export/budgets?format=csv|json|xlsx
    [HttpGet("export/budgets")]
    public async Task<IActionResult> ExportBudgets([FromQuery] string? format)
    {
        var (bytes, mime, filename) = await _service.ExportBudgetsAsync(GetUserId(), Parse(format));
        return File(bytes, mime, filename);
    }
}
