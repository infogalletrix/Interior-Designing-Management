using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Deal
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Value { get; set; }

        // Links to CrmContact.Id (stored as string in frontend, int in DB)
        public int ContactId { get; set; }

        // LEAD | CONTACTED | PROPOSAL | NEGOTIATION | WON | LOST
        public string Stage { get; set; } = "LEAD";

        public string CloseDate { get; set; } = string.Empty;
    }
}
