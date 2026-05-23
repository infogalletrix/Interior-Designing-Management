using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class PaymentReceipt
    {
        public int Id { get; set; }

        public string ReceiptNo { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;

        public string SiteId { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountPaid { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal RemainingAmount { get; set; }

        // "Completed" | "Partial" | "Pending" | "Draft"
        public string Status { get; set; } = "Completed";

        // e.g. "Advance Payment", "Partial Payment", "Final Settlement"
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Comments { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = "Cash";
    }
}
