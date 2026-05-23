using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mona_Interior.models
{
    public class Invoice
    {
        public int Id { get; set; }

        [Required]
        public string InvoiceNo { get; set; } = string.Empty;

        public string InvoiceDate { get; set; } = string.Empty;

        [Required]
        public string ClientName { get; set; } = string.Empty;

        public string ClientAddress { get; set; } = string.Empty;

        public string OrganizationName { get; set; } = string.Empty;
        public string GstNumber { get; set; } = string.Empty;

        public string ProjectTitle { get; set; } = string.Empty;
        public string WorkDescription { get; set; } = string.Empty;

        // Full items payload stored as JSON (matches BillingPage.jsx saveInvoice shape)
        [Column(TypeName = "longtext")]
        public string Items { get; set; } = "{}";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }

        // "GST" | "Non-GST"
        public string BillType { get; set; } = "GST";

        // "Unpaid" | "Paid" | "Partial"
        public string Status { get; set; } = "Unpaid";

        // ISO date string for DB sorting
        public string Date { get; set; } = string.Empty;
    }
}
