using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/exchange-rates")]
[Authorize]
public class ExchangeRatesController : BaseController
{
    private readonly IExchangeRateService _rateService;

    public ExchangeRatesController(IExchangeRateService rateService)
    {
        _rateService = rateService;
    }

    // GET api/exchange-rates
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _rateService.GetAllAsync(GetUserId()));

    // GET api/exchange-rates/pair?from=USD&to=VND
    [HttpGet("pair")]
    public async Task<IActionResult> GetByPair([FromQuery] string from, [FromQuery] string to)
        => Ok(await _rateService.GetByPairAsync(GetUserId(), from, to));

    // GET api/exchange-rates/convert?amount=100&from=USD&to=VND&date=2026-05-28
    [HttpGet("convert")]
    public async Task<IActionResult> Convert(
        [FromQuery] decimal amount,
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] DateTime? date)
    {
        try { return Ok(await _rateService.ConvertAsync(GetUserId(), amount, from, to, date)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // POST api/exchange-rates
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExchangeRateDto request)
    {
        try { return Ok(await _rateService.CreateAsync(GetUserId(), request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex)    { return BadRequest(new { message = ex.Message }); }
    }

    // POST api/exchange-rates/bulk
    // Body: { "rates": { "USD": 25450, "EUR": 27500 }, "rate_date": "2026-05-28" }
    [HttpPost("bulk")]
    public async Task<IActionResult> Bulk([FromBody] BulkRatesDto request)
    {
        try
        {
            var count = await _rateService.BulkUpsertAgainstPrimaryAsync(GetUserId(), request);
            return Ok(new { upserted = count });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/exchange-rates/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExchangeRateDto request)
    {
        try { return Ok(await _rateService.UpdateAsync(GetUserId(), id, request)); }
        catch (KeyNotFoundException ex)      { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex)         { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException)  { return Forbid(); }
    }

    // DELETE api/exchange-rates/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _rateService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
