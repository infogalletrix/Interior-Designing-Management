using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class PayrollRecord
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }

        public string Month { get; set; } = string.Empty; // e.g. "May"
        public int Year { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BaseSalary { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Deductions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetPay { get; set; }

        public string PaidDate { get; set; } = string.Empty;

        // "Paid" | "Pending"
        public string Status { get; set; } = "Pending";

        // Serialized attendance breakdown for that month
        public string AttendanceBreakdown { get; set; } = "{}";
    }
}
