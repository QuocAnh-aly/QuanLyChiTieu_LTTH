using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.APIService.Controllers;

[Route("api/accounts")]
[Authorize]
public class AccountController : BaseController
{
    private readonly IAccountService _accountService;
    private readonly ITransactionService _transactionService;

    public AccountController(IAccountService accountService, ITransactionService transactionService)
    {
        _accountService = accountService;
        _transactionService = transactionService;
    }

    // GET api/accounts
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (pageSize <= 0 || pageSize > 100) pageSize = 50;
        if (page <= 0) page = 1;

        var result = await _accountService.GetAllPagedAsync(GetUserId(), page, pageSize);
        return Ok(result);
    }

    // GET api/accounts/type/{typeId}
    [HttpGet("type/{typeId:int}")]
    public async Task<IActionResult> GetByType(int typeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (pageSize <= 0 || pageSize > 100) pageSize = 50;
        if (page <= 0) page = 1;

        var result = await _accountService.GetByTypePagedAsync(GetUserId(), typeId, page, pageSize);
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
            return StatusCode(403, new { message = ex.Message });
        }
    }

    // GET api/accounts/wallet-summary?page=1&pageSize=12&search=…&sortBy=balance-desc
    [HttpGet("wallet-summary")]
    public async Task<IActionResult> GetWalletSummary(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null)
    {
        if (pageSize <= 0 || pageSize > 100) pageSize = 50;
        if (page <= 0) page = 1;

        var result = await _accountService.GetWalletSummaryAsync(GetUserId(), page, pageSize, search, sortBy);
        return Ok(result);
    }

    // POST api/accounts/reconcile?repair=false
    // Đối soát số dư ví với sổ cái. repair=true sẽ sửa các số dư bị lệch.
    [HttpPost("reconcile")]
    public async Task<IActionResult> Reconcile([FromQuery] bool repair = false)
    {
        var result = await _accountService.ReconcileBalancesAsync(GetUserId(), repair);
        return Ok(result);
    }

    // POST api/accounts
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountDto request)
    {
        // Nếu có SourceAccountId, tạo account với balance=0 và tạo transaction riêng
        if (request.SourceAccountId.HasValue)
        {
            var amount = Math.Abs(request.Balance ?? 0);
            if (amount <= 0)
                return BadRequest(new { message = "Số tiền không hợp lệ khi chọn tài khoản nguồn" });

            var sourceAccId = request.SourceAccountId.Value;
            var typeId = request.TypeId;
            var name = request.Name;

            // Tạo account với balance = 0 (transaction sẽ cập nhật balance)
            request.Balance = 0;
            // Safety: set initialBalance để progress bar hoạt động
            if (typeId == 2) // Liability
                request.InitialBalance = -amount;
            var result = await _accountService.CreateAsync(GetUserId(), request);

            if (typeId == 2) // Liability: gán nợ vào tài khoản bank
            {
                // Debit = source (bank tăng), Credit = new debt (nợ tăng)
                await _transactionService.CreateAsync(GetUserId(), new CreateTransactionDto
                {
                    DebitAccountId = sourceAccId,
                    CreditAccountId = result.AccountId,
                    Amount = amount,
                    Description = $"Gán nợ: {name}",
                    TransactionDate = DateTime.UtcNow
                });
            }
            else // Asset: tạo tài khoản từ nguồn tiền
            {
                // Debit = new account (tài sản tăng), Credit = source (nguồn giảm)
                await _transactionService.CreateAsync(GetUserId(), new CreateTransactionDto
                {
                    DebitAccountId = result.AccountId,
                    CreditAccountId = sourceAccId,
                    Amount = amount,
                    Description = $"Tạo tài khoản từ {name}",
                    TransactionDate = DateTime.UtcNow
                });
            }

            return CreatedAtAction(nameof(GetById), new { id = result.AccountId }, result);
        }

        var account = await _accountService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = account.AccountId }, account);
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
            return StatusCode(403, new { message = ex.Message });
        }
    }

    // DELETE api/accounts/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int? transferToAccountId = null, [FromQuery] bool force = false)
    {
        try
        {
            await _accountService.DeleteAsync(GetUserId(), id, transferToAccountId, force);
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("FK") || msg.Contains("REFERENCE") || msg.Contains("conflicted"))
                return BadRequest(new { message = "Không thể xoá vì dữ liệu này đang được sử dụng. Hãy xoá các bản ghi liên quan trước." });
            return StatusCode(500, new { message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau." });
        }
    }
}
