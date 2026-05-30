using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/recurring")]
[Authorize]
public class RecurringController : BaseController
{
    private readonly IRecurringService _recurringService;

    public RecurringController(IRecurringService recurringService)
    {
        _recurringService = recurringService;
    }

    // GET api/recurring
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _recurringService.GetByUserAsync(GetUserId());
        return Ok(result);
    }

    // GET api/recurring/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await _recurringService.GetByIdAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    // POST api/recurring
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecurringDto request)
    {
        var result = await _recurringService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = result.RecurringId }, result);
    }

    // PUT api/recurring/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRecurringDto request)
    {
        try
        {
            var result = await _recurringService.UpdateAsync(GetUserId(), id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    // DELETE api/recurring/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _recurringService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }
}
