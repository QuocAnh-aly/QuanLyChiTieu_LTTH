using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.APIService.Controllers;

[Route("api/budgets")]
[Authorize]
public class BudgetController : BaseController
{
    private readonly IBudgetService _budgetService;

    public BudgetController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    // ─── Expense Budgets (Budget.jsx) ────────────────────────────────────────

    // GET api/budgets/expense
    [HttpGet("expense")]
    public async Task<IActionResult> GetExpenseBudgets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? filterStatus = null,
        [FromQuery] string? sortBy = null)
    {
        if (pageSize <= 0 || pageSize > 100) pageSize = 50;
        if (page <= 0) page = 1;

        var result = await _budgetService.GetExpenseBudgetsPagedAsync(GetUserId(), page, pageSize, search, filterStatus, sortBy);
        return Ok(result);
    }

    // GET api/budgets/expense/{id}
    [HttpGet("expense/{id:int}")]
    public async Task<IActionResult> GetExpenseBudgetById(int id)
    {
        try
        {
            var result = await _budgetService.GetExpenseBudgetByIdAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // POST api/budgets/expense
    [HttpPost("expense")]
    public async Task<IActionResult> CreateExpenseBudget([FromBody] CreateBudgetDto request)
    {
        try
        {
            var result = await _budgetService.CreateExpenseBudgetAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetExpenseBudgetById), new { id = result.BudgetId }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể tạo ngân sách vì tài khoản liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }

    // PUT api/budgets/expense/{id}
    [HttpPut("expense/{id:int}")]
    public async Task<IActionResult> UpdateExpenseBudget(int id, [FromBody] UpdateBudgetDto request)
    {
        try
        {
            var result = await _budgetService.UpdateExpenseBudgetAsync(GetUserId(), id, request);
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
                return BadRequest(new { message = "Không thể cập nhật ngân sách vì dữ liệu liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }

    // DELETE api/budgets/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _budgetService.DeleteBudgetAsync(GetUserId(), id);
            return NoContent();
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
                return BadRequest(new { message = "Không thể xoá ngân sách vì dữ liệu đang được sử dụng." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }

    // ─── Savings Goals (Savings.jsx) ─────────────────────────────────────────

    // GET api/budgets/savings
    [HttpGet("savings")]
    public async Task<IActionResult> GetSavingsGoals()
    {
        var result = await _budgetService.GetSavingsGoalsAsync(GetUserId());
        return Ok(result);
    }

    // GET api/budgets/savings/{id}
    [HttpGet("savings/{id:int}")]
    public async Task<IActionResult> GetSavingsGoalById(int id)
    {
        try
        {
            var result = await _budgetService.GetSavingsGoalByIdAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // POST api/budgets/savings
    [HttpPost("savings")]
    public async Task<IActionResult> CreateSavingsGoal([FromBody] CreateSavingsGoalDto request)
    {
        var result = await _budgetService.CreateSavingsGoalAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetSavingsGoalById), new { id = result.BudgetId }, result);
    }

    // POST api/budgets/savings/{id}/add
    [HttpPost("savings/{id:int}/add")]
    public async Task<IActionResult> AddMoney(int id, [FromBody] AddRemoveMoneyDto request)
    {
        try
        {
            var result = await _budgetService.AddMoneyAsync(GetUserId(), id, request.Amount, request.Notes);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex)    { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/budgets/savings/{id}/remove
    [HttpPost("savings/{id:int}/remove")]
    public async Task<IActionResult> RemoveMoney(int id, [FromBody] AddRemoveMoneyDto request)
    {
        try
        {
            var result = await _budgetService.RemoveMoneyAsync(GetUserId(), id, request.Amount, request.Notes);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex)    { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/budgets/savings/{id}/reset
    [HttpPost("savings/{id:int}/reset")]
    public async Task<IActionResult> ResetHistory(int id)
    {
        try
        {
            await _budgetService.ResetHistoryAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // GET api/budgets/savings/{id}/events
    [HttpGet("savings/{id:int}/events")]
    public async Task<IActionResult> GetEvents(int id)
    {
        try
        {
            var result = await _budgetService.GetEventsAsync(GetUserId(), id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // PUT api/budgets/savings/{id}
    [HttpPut("savings/{id:int}")]
    public async Task<IActionResult> UpdateSavingsGoal(int id, [FromBody] UpdateSavingsGoalDto request)
    {
        try
        {
            var result = await _budgetService.UpdateSavingsGoalAsync(GetUserId(), id, request);
            return Ok(result);
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
                return BadRequest(new { message = "Không thể cập nhật mục tiêu vì dữ liệu liên quan không tồn tại." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }
}
