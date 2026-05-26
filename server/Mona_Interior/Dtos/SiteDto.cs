using System.Text.Json;

namespace Mona_Interior.Dtos
{
    public class SiteDto
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string? OrganizationName { get; set; }
        public string AssignedTeam { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Status { get; set; } = "Pre-Construction";
        public string StartDate { get; set; } = string.Empty;
        public decimal Budget { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsNegotiated { get; set; }
        public string NegotiationDetails { get; set; } = string.Empty;
        public bool IsArchived { get; set; }
        public JsonElement? WorkHistory { get; set; }
        public JsonElement? Maintenance { get; set; }
    }
}
