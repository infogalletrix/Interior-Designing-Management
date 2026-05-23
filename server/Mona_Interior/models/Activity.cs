using System.ComponentModel.DataAnnotations;

namespace Mona_Interior.models
{
    public class Activity
    {
        public int Id { get; set; }

        [Required]
        public string Type { get; set; } = string.Empty; // e.g. "Follow-up Call"

        public string Date { get; set; } = string.Empty;

        // Stores CrmContact.Id as string (matches frontend pattern)
        public string ClientId { get; set; } = string.Empty;

        // Pending | Scheduled | Completed
        public string Status { get; set; } = "Pending";
    }
}
