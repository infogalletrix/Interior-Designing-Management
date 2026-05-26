namespace Mona_Interior.Dtos
{
    public class AttendanceDto
    {
        public string? Id { get; set; }
        public int EmployeeId { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = "Present";
        public decimal Overtime { get; set; }
    }
}
