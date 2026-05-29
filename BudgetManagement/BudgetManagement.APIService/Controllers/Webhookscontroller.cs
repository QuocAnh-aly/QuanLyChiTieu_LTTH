using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/webhooks")]
[Authorize]
public class WebhooksController : BaseController
{
    private readonly IWebhookService _service;

    public WebhooksController(IWebhookService service)
    {
        _service = service;
    }

    // GET api/webhooks
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync(GetUserId()));

    // GET api/webhooks/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try { return Ok(await _service.GetByIdAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/webhooks
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebhookDto request)
    {
        try
        {
            var result = await _service.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.WebhookId }, result);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/webhooks/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateWebhookDto request)
    {
        try { return Ok(await _service.UpdateAsync(GetUserId(), id, request)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex)        { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // DELETE api/webhooks/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // GET api/webhooks/{id}/messages?take=50
    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id, [FromQuery] int take = 50)
    {
        try { return Ok(await _service.GetMessagesAsync(GetUserId(), id, take)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/webhooks/{id}/submit — manual fire with optional payload
    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> Submit(int id, [FromBody] object? payload)
    {
        try { return Ok(await _service.SubmitAsync(GetUserId(), id, payload)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
