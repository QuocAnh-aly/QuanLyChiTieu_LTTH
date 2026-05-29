using BudgetManagement.Dto;
using BudgetManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[Route("api/attachments")]
[Authorize]
public class AttachmentsController : BaseController
{
    private readonly IAttachmentService _service;

    public AttachmentsController(IAttachmentService service)
    {
        _service = service;
    }

    // GET api/attachments
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync(GetUserId()));

    // GET api/attachments/by/{type}/{id}
    [HttpGet("by/{type}/{id:int}")]
    public async Task<IActionResult> GetByAttachable(string type, int id)
    {
        try { return Ok(await _service.GetByAttachableAsync(GetUserId(), type, id)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // GET api/attachments/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try { return Ok(await _service.GetByIdAsync(GetUserId(), id)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // POST api/attachments  (multipart/form-data)
    //   form fields: attachable_type, attachable_id, title?, notes?, file (file part)
    [HttpPost]
    [RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] string attachable_type,
        [FromForm] int    attachable_id,
        [FromForm] string? title,
        [FromForm] string? notes,
        [FromForm] IFormFile file)
    {
        try
        {
            if (file is null) return BadRequest(new { message = "File is required." });
            var meta = new CreateAttachmentDto
            {
                AttachableType = attachable_type,
                AttachableId   = attachable_id,
                Title          = title,
                Notes          = notes,
            };
            using var stream = file.OpenReadStream();
            var input = new AttachmentUploadInput
            {
                Content  = stream,
                Filename = file.FileName,
                Mime     = file.ContentType,
                Size     = file.Length,
            };
            var result = await _service.CreateAsync(GetUserId(), meta, input);
            return CreatedAtAction(nameof(GetById), new { id = result.AttachmentId }, result);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PUT api/attachments/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAttachmentDto request)
    {
        try { return Ok(await _service.UpdateAsync(GetUserId(), id, request)); }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // DELETE api/attachments/{id}
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

    // GET api/attachments/{id}/download
    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        try
        {
            var (stream, mime, filename) = await _service.DownloadAsync(GetUserId(), id);
            return File(stream, mime, filename);
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { message = ex.Message }); }
        catch (FileNotFoundException)       { return NotFound(new { message = "File missing on disk." }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
