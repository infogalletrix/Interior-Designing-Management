namespace Mona_Interior.Dtos
{
    public class CrmContactDto
    {
        public string? Id { get; set; }      // frontend sends string IDs ("c123")
        public string Name { get; set; } = string.Empty;
        public string? OrganizationName { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Project { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Status { get; set; } = "Cold";
        public string Source { get; set; } = string.Empty;
        public List<string>? Tags { get; set; }
        public string? Date { get; set; }
    }
}
