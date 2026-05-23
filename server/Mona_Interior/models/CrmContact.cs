using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class CrmContact
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string OrganizationName { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Project { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;

        // "Hot" | "Warm" | "Cold"
        public string Status { get; set; } = "Cold";

        // Lead source e.g. Instagram, Referral
        public string Source { get; set; } = string.Empty;

        // Stored as JSON array string e.g. ["Modern","Kitchen"]
        public string Tags { get; set; } = "[]";

        public string Date { get; set; } = string.Empty;
    }
}
