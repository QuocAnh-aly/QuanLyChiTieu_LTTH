using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/rule-groups")]
[Authorize]
public class RuleGroupsController : BaseController
{
    private readonly IRuleService _ruleService;

    public RuleGroupsController(IRuleService ruleService)
    {
        _ruleService = ruleService;
    }

    // GET api/rule-groups
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _ruleService.GetGroupsAsync(GetUserId()));

    // POST api/rule-groups
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleGroupDto request)
    {
        try { return Ok(await _ruleService.CreateGroupAsync(GetUserId(), request)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/rule-groups/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRuleGroupDto request)
    {
        try { return Ok(await _ruleService.UpdateGroupAsync(GetUserId(), id, request)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // DELETE api/rule-groups/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _ruleService.DeleteGroupAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
