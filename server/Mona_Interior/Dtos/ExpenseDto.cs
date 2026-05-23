namespace Mona_Interior.Dtos
{
    public class ExpenseDto
    {
        public string? Id { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? ClientId { get; set; }
        public string Type { get; set; } = "general";
    }
}
