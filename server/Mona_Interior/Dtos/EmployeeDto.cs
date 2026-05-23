namespace Mona_Interior.Dtos
{
    public class EmployeeDto
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal Salary { get; set; }
        public string JoinDate { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public string Address { get; set; } = string.Empty;
        public decimal AdvanceBalance { get; set; }
        public string BankDetails { get; set; } = string.Empty;
        public string GovId { get; set; } = string.Empty;
        public string SalaryType { get; set; } = "Monthly";
        public string WorkerId { get; set; } = string.Empty;
    }
}
