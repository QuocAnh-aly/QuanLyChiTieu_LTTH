using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/bills")]
[Authorize]
public class BillController : BaseController
{
    private readonly IBillService _billService;

    public BillController(IBillService billService)
    {
        _billService = billService;
    }

    // GET api/bills
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (pageSize <= 0 || pageSize > 100) pageSize = 50;
        if (page <= 0) page = 1;

        var result = await _billService.GetAllPagedAsync(GetUserId(), page, pageSize);
        return Ok(result);
    }

    // GET api/bills/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await _billService.GetByIdAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/bills
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBillDto request)
    {
        var result = await _billService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = result.BillId }, result);
    }

    // PUT api/bills/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBillDto request)
    {
        try
        {
            var result = await _billService.UpdateAsync(GetUserId(), id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // DELETE api/bills/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _billService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/bills/{id}/rescan
    [HttpPost("{id:int}/rescan")]
    public async Task<IActionResult> Rescan(int id)
    {
        try
        {
            var result = await _billService.RescanAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException)  { return Forbid(); }
    }
}
