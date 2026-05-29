using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/currencies")]
[Authorize]
public class CurrenciesController : BaseController
{
    private readonly ICurrencyService _currencyService;

    public CurrenciesController(ICurrencyService currencyService)
    {
        _currencyService = currencyService;
    }

    // GET api/currencies
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _currencyService.GetAllAsync(GetUserId()));

    // GET api/currencies/primary
    [HttpGet("primary")]
    public async Task<IActionResult> GetPrimary()
    {
        var p = await _currencyService.GetPrimaryAsync(GetUserId());
        return p is null ? NotFound(new { message = "No primary currency set." }) : Ok(p);
    }

    // GET api/currencies/{code}
    [HttpGet("{code}")]
    public async Task<IActionResult> GetByCode(string code)
    {
        try { return Ok(await _currencyService.GetByCodeAsync(GetUserId(), code)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // POST api/currencies
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCurrencyDto request)
    {
        try
        {
            var result = await _currencyService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetByCode), new { code = result.Code }, result);
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (ArgumentException ex)         { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/currencies/{code}
    [HttpPut("{code}")]
    public async Task<IActionResult> Update(string code, [FromBody] UpdateCurrencyDto request)
    {
        try { return Ok(await _currencyService.UpdateAsync(GetUserId(), code, request)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // DELETE api/currencies/{code}
    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code)
    {
        try
        {
            await _currencyService.DeleteAsync(GetUserId(), code);
            return NoContent();
        }
        catch (KeyNotFoundException ex)      { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // POST api/currencies/{code}/primary
    [HttpPost("{code}/primary")]
    public async Task<IActionResult> SetPrimary(string code)
    {
        try { return Ok(await _currencyService.SetPrimaryAsync(GetUserId(), code)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // POST api/currencies/{code}/enable
    [HttpPost("{code}/enable")]
    public async Task<IActionResult> Enable(string code)
    {
        try { return Ok(await _currencyService.EnableAsync(GetUserId(), code)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // POST api/currencies/{code}/disable
    [HttpPost("{code}/disable")]
    public async Task<IActionResult> Disable(string code)
    {
        try { return Ok(await _currencyService.DisableAsync(GetUserId(), code)); }
        catch (KeyNotFoundException ex)      { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
