namespace Mona_Interior.Dtos
{
    public class DealDto
    {
        public string? Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string ContactId { get; set; } = string.Empty;
        public string Stage { get; set; } = "LEAD";
        public string CloseDate { get; set; } = string.Empty;
    }
}
