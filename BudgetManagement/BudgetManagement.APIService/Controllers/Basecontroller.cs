using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.APIService.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    /// <summary>
    /// Lấy userId từ JWT claim — dùng trong mọi controller cần xác thực.
    /// </summary>
    protected int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");
        return int.Parse(claim);
    }
}