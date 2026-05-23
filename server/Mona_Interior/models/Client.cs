using System.ComponentModel.DataAnnotations;

namespace Mona_Interior.models
{
    public class Client
    {
     public int Id { get; set; }

    [Required]
    public string FullName { get; set; } = string.Empty;

    public string OrganizationName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    [EmailAddress]
    public string EmailAddress { get; set; } = string.Empty;

    public string ProjectFocus { get; set; } = string.Empty; // e.g., "Modern Kitchen Remodel"

    public string LeadSource { get; set; } = string.Empty; // e.g., "Instagram" or "Referral"


    }
}
