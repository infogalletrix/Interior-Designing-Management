namespace Mona_Interior.Dtos
{
    public class PaymentReceiptDto
    {
        public string? Id { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string SiteId { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Status { get; set; } = "Completed";
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Comments { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = "Cash";
    }
}
