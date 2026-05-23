using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;
using System.Text.Json;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/crm")]
    public class CrmController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public CrmController(MonainteriorDbContext db) => _db = db;

        // ── CONTACTS ─────────────────────────────────────────────────

        // GET /api/crm
        [HttpGet]
        public async Task<IActionResult> GetContacts()
        {
            var contacts = await _db.CrmContacts.ToListAsync();
            var result = contacts.Select(c => new
            {
                id = c.Id.ToString(),
                name = c.Name,
                organizationName = c.OrganizationName,
                phone = c.Phone,
                email = c.Email,
                project = c.Project,
                address = c.Address,
                status = c.Status,
                source = c.Source,
                tags = JsonSerializer.Deserialize<List<string>>(c.Tags ?? "[]"),
                date = c.Date
            });
            return Ok(result);
        }

        // POST /api/crm
        [HttpPost]
        public async Task<IActionResult> CreateContact([FromBody] CrmContactDto dto)
        {
            var contact = new CrmContact
            {
                Name = dto.Name,
                OrganizationName = dto.OrganizationName ?? "",
                Phone = dto.Phone,
                Email = dto.Email,
                Project = dto.Project,
                Address = dto.Address,
                Status = dto.Status,
                Source = dto.Source,
                Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>()),
                Date = dto.Date ?? DateTime.Now.ToString("yyyy-MM-dd")
            };
            _db.CrmContacts.Add(contact);
            await _db.SaveChangesAsync();
            return Ok(new { id = contact.Id.ToString(), message = "Contact created" });
        }

        // PUT /api/crm/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateContact(int id, [FromBody] CrmContactDto dto)
        {
            var contact = await _db.CrmContacts.FindAsync(id);
            if (contact == null) return NotFound();

            contact.Name = dto.Name;
            contact.OrganizationName = dto.OrganizationName ?? contact.OrganizationName;
            contact.Phone = dto.Phone;
            contact.Email = dto.Email;
            contact.Project = dto.Project;
            contact.Address = dto.Address;
            contact.Status = dto.Status;
            contact.Source = dto.Source;
            contact.Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>());

            await _db.SaveChangesAsync();
            return Ok(new { message = "Contact updated" });
        }

        // ── DEALS ────────────────────────────────────────────────────

        // GET /api/crm/deals/all
        [HttpGet("deals/all")]
        public async Task<IActionResult> GetDeals()
        {
            var deals = await _db.Deals.ToListAsync();
            var result = deals.Select(d => new
            {
                id = d.Id.ToString(),
                title = d.Title,
                value = d.Value,
                contact_id = d.ContactId.ToString(),
                stage = d.Stage,
                close_date = d.CloseDate
            });
            return Ok(result);
        }

        // POST /api/crm/deals
        [HttpPost("deals")]
        public async Task<IActionResult> CreateDeal([FromBody] DealDto dto)
        {
            int contactId = 0;
            if (!string.IsNullOrWhiteSpace(dto.ContactId))
            {
                if (!int.TryParse(dto.ContactId, out contactId))
                {
                    var newContact = new CrmContact { Name = dto.ContactId, Status = "Cold", Source = "Other", Date = DateTime.Now.ToString("yyyy-MM-dd"), Phone = "-", Email = "-", Address = "-", Project = "-", Tags = "[]" };
                    _db.CrmContacts.Add(newContact);
                    await _db.SaveChangesAsync();
                    contactId = newContact.Id;
                }
            }

            var deal = new Deal
            {
                Title = dto.Title,
                Value = dto.Value,
                ContactId = contactId,
                Stage = dto.Stage ?? "LEAD",
                CloseDate = dto.CloseDate
            };
            _db.Deals.Add(deal);
            await _db.SaveChangesAsync();
            return Ok(new { id = deal.Id.ToString(), message = "Deal created" });
        }

        // PUT /api/crm/deals/{id}
        [HttpPut("deals/{id}")]
        public async Task<IActionResult> UpdateDeal(int id, [FromBody] DealDto dto)
        {
            var deal = await _db.Deals.FindAsync(id);
            if (deal == null) return NotFound();

            deal.Title = dto.Title;
            deal.Value = dto.Value;
            deal.Stage = dto.Stage ?? deal.Stage;
            deal.CloseDate = dto.CloseDate;
            
            if (!string.IsNullOrWhiteSpace(dto.ContactId))
            {
                if (!int.TryParse(dto.ContactId, out int contactId))
                {
                    var newContact = new CrmContact { Name = dto.ContactId, Status = "Cold", Source = "Other", Date = DateTime.Now.ToString("yyyy-MM-dd"), Phone = "-", Email = "-", Address = "-", Project = "-", Tags = "[]" };
                    _db.CrmContacts.Add(newContact);
                    await _db.SaveChangesAsync();
                    deal.ContactId = newContact.Id;
                }
                else
                {
                    deal.ContactId = contactId;
                }
            }
            else
            {
                deal.ContactId = 0;
            }

            // Sync with Quotation
            var linkedQuotation = await _db.Quotations.FirstOrDefaultAsync(q => q.DealId == deal.Id);
            if (linkedQuotation != null)
            {
                linkedQuotation.Status = deal.Stage switch {
                    "PROPOSAL" => "Pending",
                    "NEGOTIATION" => "Negotiating",
                    "WON" => "Approved",
                    "LOST" => "Rejected",
                    _ => linkedQuotation.Status
                };
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Deal updated" });
        }

        // ── ACTIVITIES ───────────────────────────────────────────────

        // GET /api/crm/activities/all
        [HttpGet("activities/all")]
        public async Task<IActionResult> GetActivities()
        {
            var acts = await _db.Activities.ToListAsync();
            var result = acts.Select(a => new
            {
                id = a.Id.ToString(),
                type = a.Type,
                date = a.Date,
                client = a.ClientId,
                status = a.Status
            });
            return Ok(result);
        }

        // POST /api/crm/activities
        [HttpPost("activities")]
        public async Task<IActionResult> CreateActivity([FromBody] ActivityDto dto)
        {
            string clientIdStr = dto.Client;
            if (!string.IsNullOrWhiteSpace(clientIdStr) && !int.TryParse(clientIdStr, out _))
            {
                var newContact = new CrmContact { Name = clientIdStr, Status = "Cold", Source = "Other", Date = DateTime.Now.ToString("yyyy-MM-dd"), Phone = "-", Email = "-", Address = "-", Project = "-", Tags = "[]" };
                _db.CrmContacts.Add(newContact);
                await _db.SaveChangesAsync();
                clientIdStr = newContact.Id.ToString();
            }

            var act = new Activity
            {
                Type = dto.Type,
                Date = dto.Date,
                ClientId = string.IsNullOrWhiteSpace(clientIdStr) ? "0" : clientIdStr,
                Status = dto.Status
            };
            _db.Activities.Add(act);
            await _db.SaveChangesAsync();
            return Ok(new { id = act.Id.ToString(), message = "Activity created" });
        }

        // PUT /api/crm/activities/{id}
        [HttpPut("activities/{id}")]
        public async Task<IActionResult> UpdateActivity(int id, [FromBody] ActivityDto dto)
        {
            var act = await _db.Activities.FindAsync(id);
            if (act == null) return NotFound();

            string clientIdStr = dto.Client;
            if (!string.IsNullOrWhiteSpace(clientIdStr) && !int.TryParse(clientIdStr, out _))
            {
                var newContact = new CrmContact { Name = clientIdStr, Status = "Cold", Source = "Other", Date = DateTime.Now.ToString("yyyy-MM-dd"), Phone = "-", Email = "-", Address = "-", Project = "-", Tags = "[]" };
                _db.CrmContacts.Add(newContact);
                await _db.SaveChangesAsync();
                clientIdStr = newContact.Id.ToString();
            }

            act.Type = dto.Type;
            act.Date = dto.Date;
            act.ClientId = string.IsNullOrWhiteSpace(clientIdStr) ? "0" : clientIdStr;
            act.Status = dto.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Activity updated" });
        }

        // DELETE /api/crm/activities/{id}
        [HttpDelete("activities/{id}")]
        public async Task<IActionResult> DeleteActivity(int id)
        {
            var act = await _db.Activities.FindAsync(id);
            if (act == null) return NotFound();

            _db.Activities.Remove(act);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Activity deleted" });
        }
    }
}
