using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/rules")]
[Authorize]
public class RulesController : BaseController
{
    private readonly IRuleService _ruleService;

    public RulesController(IRuleService ruleService)
    {
        _ruleService = ruleService;
    }

    // GET api/rules
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _ruleService.GetAllAsync(GetUserId()));

    // GET api/rules/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try { return Ok(await _ruleService.GetByIdAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/rules
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleDto request)
    {
        try
        {
            var result = await _ruleService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.RuleId }, result);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/rules/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRuleDto request)
    {
        try { return Ok(await _ruleService.UpdateAsync(GetUserId(), id, request)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // DELETE api/rules/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _ruleService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/rules/{id}/toggle
    [HttpPost("{id:int}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        try { return Ok(await _ruleService.ToggleActiveAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/rules/{id}/test — dry-run, returns matching transactions
    [HttpPost("{id:int}/test")]
    public async Task<IActionResult> Test(int id)
    {
        try { return Ok(await _ruleService.TestAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/rules/{id}/trigger — apply actions to matching transactions
    [HttpPost("{id:int}/trigger")]
    public async Task<IActionResult> Trigger(int id)
    {
        try { return Ok(await _ruleService.TriggerAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
