using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.APIService.Controllers;

[Route("api/transactions")]
[Authorize]
public class TransactionController : BaseController
{
    private readonly ITransactionService _transactionService;

    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    // GET api/transactions?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _transactionService.GetByUserAsync(GetUserId(), page, pageSize);
        return Ok(result);
    }

    // GET api/transactions/range?from=2026-01-01&to=2026-01-31
    [HttpGet("range")]
    public async Task<IActionResult> GetByDateRange(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var result = await _transactionService.GetByDateRangeAsync(GetUserId(), from, to);
        return Ok(result);
    }

    // GET api/transactions/range/account?accountId=X&from=...&to=...
    [HttpGet("range/account")]
    public async Task<IActionResult> GetByDateRangeAndAccount(
        [FromQuery] int accountId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var result = await _transactionService.GetByDateRangeAndAccountAsync(GetUserId(), from, to, accountId);
        return Ok(result);
    }

    // GET api/transactions/range/budget?budgetId=X&from=...&to=...
    [HttpGet("range/budget")]
    public async Task<IActionResult> GetByDateRangeAndBudget(
        [FromQuery] int budgetId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var result = await _transactionService.GetByDateRangeAndBudgetAsync(GetUserId(), from, to, budgetId);
        return Ok(result);
    }

    // GET api/transactions/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var result = await _transactionService.GetByIdAsync(GetUserId(), id);
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

    // GET api/transactions/cashflow?from=2026-01-01&to=2026-01-31
    [HttpGet("cashflow")]
    public async Task<IActionResult> GetCashFlow(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var now        = DateTime.UtcNow;
        var rangeFrom  = from ?? new DateTime(now.Year, now.Month, 1);
        var rangeTo    = to   ?? rangeFrom.AddMonths(1).AddSeconds(-1);

        var result = await _transactionService.GetCashFlowAsync(GetUserId(), rangeFrom, rangeTo);
        return Ok(result);
    }

    // POST api/transactions
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionDto request)
    {
        try
        {
            var result = await _transactionService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.JournalId }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể tạo giao dịch vì tài khoản liên quan không tồn tại hoặc đã bị xoá." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }

    // PUT api/transactions/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTransactionDto request)
    {
        try
        {
            var result = await _transactionService.UpdateAsync(GetUserId(), id, request);
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
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể cập nhật giao dịch vì tài khoản liên quan không tồn tại hoặc đã bị xoá." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }

    // DELETE api/transactions/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _transactionService.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể xoá giao dịch vì dữ liệu liên quan đang được sử dụng." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }
}
