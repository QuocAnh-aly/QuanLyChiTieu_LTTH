using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BudgetManagement.Entities;

public class AccountType
{
    [Key]
    public int TypeId { get; set; }
    public string TypeName { get; set; } = null!;
    
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
