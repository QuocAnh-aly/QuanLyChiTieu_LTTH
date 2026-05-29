using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/search")]
[Authorize]
public class SearchController : BaseController
{
    private readonly ISearchService _service;

    public SearchController(ISearchService service) { _service = service; }

    // GET api/search/transactions?q=&from=&to=&limit=100
    [HttpGet("transactions")]
    public async Task<IActionResult> Transactions(
        [FromQuery] string? q,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 100)
        => Ok(await _service.SearchTransactionsAsync(GetUserId(), q, from, to, limit));

    // GET api/search/transactions/count
    [HttpGet("transactions/count")]
    public async Task<IActionResult> TransactionsCount(
        [FromQuery] string? q,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
        => Ok(new { count = await _service.CountTransactionsAsync(GetUserId(), q, from, to) });

    // GET api/search/accounts?q=&type_id=
    [HttpGet("accounts")]
    public async Task<IActionResult> Accounts(
        [FromQuery] string? q,
        [FromQuery(Name = "type_id")] int? typeId)
        => Ok(await _service.SearchAccountsAsync(GetUserId(), q, typeId));
}
