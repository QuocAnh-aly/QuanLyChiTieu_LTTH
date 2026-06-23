using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace BudgetManagement.AuthService.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");
        return int.Parse(claim);
    }
}
