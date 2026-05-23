using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Employee
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Salary { get; set; }

        public string JoinDate { get; set; } = string.Empty;

        // "Active" | "Inactive"
        public string Status { get; set; } = "Active";

        public string Address { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AdvanceBalance { get; set; } = 0;

        public string BankDetails { get; set; } = string.Empty;

        public string GovId { get; set; } = string.Empty;

        public string SalaryType { get; set; } = "Monthly";

        public string WorkerId { get; set; } = string.Empty;
    }
}
