using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/accounts")]
[Authorize]
public class AccountController : BaseController
{
    private readonly IAccountService _accountService;

    public AccountController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    // GET api/accounts
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _accountService.GetAllAsync(GetUserId());
        return Ok(result);
    }

    // GET api/accounts/type/{typeId}
    [HttpGet("type/{typeId:int}")]
    public async Task<IActionResult> GetByType(int typeId)
    {
        var result = await _accountService.GetByTypeAsync(GetUserId(), typeId);
        return Ok(result);
    }

    // GET api/accounts/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await _accountService.GetByIdAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    // GET api/accounts/wallet-summary
    [HttpGet("wallet-summary")]
    public async Task<IActionResult> GetWalletSummary()
    {
        var result = await _accountService.GetWalletSummaryAsync(GetUserId());
        return Ok(result);
    }

    // POST api/accounts
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountDto request)
    {
        var result = await _accountService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = result.AccountId }, result);
    }

    // PUT api/accounts/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAccountDto request)
    {
        try
        {
            var result = await _accountService.UpdateAsync(GetUserId(), id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    // DELETE api/accounts/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _accountService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }
}