using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        try
        {
            var result = await _billService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.BillId }, result);
        }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể tạo hoá đơn vì dữ liệu liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
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
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể cập nhật hoá đơn vì dữ liệu liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
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
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể xoá hoá đơn vì dữ liệu đang được sử dụng." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
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

    // POST api/bills/{id}/pay
    [HttpPost("{id:int}/pay")]
    public async Task<IActionResult> Pay(int id, [FromBody] PayBillDto request)
    {
        try
        {
            var result = await _billService.PayAsync(GetUserId(), id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)      { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (ArgumentException ex)         { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException)  { return Forbid(); }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể tạo giao dịch vì dữ liệu liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }
}
