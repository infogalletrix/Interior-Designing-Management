using System.ComponentModel.DataAnnotations;

namespace Mona_Interior.models
{
    public class AttendanceRecord
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }

        // ISO date string "YYYY-MM-DD"
        public string Date { get; set; } = string.Empty;

        // "Present" | "Absent" | "Half-Day" | "Leave"
        public string Status { get; set; } = "Present";
    }
}
