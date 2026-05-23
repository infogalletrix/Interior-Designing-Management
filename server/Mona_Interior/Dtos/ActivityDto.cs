namespace Mona_Interior.Dtos
{
    public class ActivityDto
    {
        public string? Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Client { get; set; } = string.Empty;  // matches frontend "client" field
        public string Status { get; set; } = "Pending";
    }
}
