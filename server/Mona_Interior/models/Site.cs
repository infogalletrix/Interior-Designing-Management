using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Site
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string ClientName { get; set; } = string.Empty;
        public string OrganizationName { get; set; } = string.Empty;
        public string AssignedTeam { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;

        // "Pre-Construction" | "In Progress" | "Completed" | "Maintenance"
        public string Status { get; set; } = "Pre-Construction";

        public string StartDate { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Budget { get; set; }

        public string Description { get; set; } = string.Empty;

        public bool IsArchived { get; set; } = false;

        // JSON array for work history entries
        [Column(TypeName = "longtext")]
        public string WorkHistory { get; set; } = "[]";
    }
}
