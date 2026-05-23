using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Quotation
    {
        public int Id { get; set; }
        
        public string QuoteNo { get; set; } = string.Empty;

        [Required]
        public string ClientName { get; set; } = string.Empty;

        public string OrganizationName { get; set; } = string.Empty;

        public string ClientAddress { get; set; } = string.Empty;

        public string ProjectTitle { get; set; } = string.Empty;
        public string WorkDescription { get; set; } = string.Empty;

        public string Date { get; set; } = string.Empty;

        // "GST" | "Non-GST"
        public string BillType { get; set; } = "GST";

        // Items stored as JSON string — serialized list of line items
        [Column(TypeName = "longtext")]
        public string Items { get; set; } = "[]";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }

        // Added for CRM Pipeline syncing
        public string Status { get; set; } = "Pending";
        public int? DealId { get; set; }
    }
}
