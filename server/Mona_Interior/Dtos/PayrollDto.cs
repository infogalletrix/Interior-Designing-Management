using System.Text.Json;

namespace Mona_Interior.Dtos
{
    public class PayrollDto
    {
        public string? Id { get; set; }
        public int EmployeeId { get; set; }
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal Deductions { get; set; }
        public decimal NetPay { get; set; }
        public string PaidDate { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public JsonElement? AttendanceBreakdown { get; set; }
    }
}
