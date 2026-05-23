using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Expense
    {
        public int Id { get; set; }

        public string Date { get; set; } = string.Empty;

        // e.g. "Materials", "Rent", "Labour", "Utilities"
        public string Category { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        // Null = general overhead; set to link to a specific client/site
        public string? ClientId { get; set; }

        // "general" | "client-specific"
        public string Type { get; set; } = "general";
    }
}
