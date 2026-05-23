using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;
using System.Text.Json;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/quotations")]
    public class QuotationsController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public QuotationsController(MonainteriorDbContext db) => _db = db;

        // Shared helper: compute next serial for YY-MM-XXXX within current month
        private int ComputeNextQuoteSerial()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            string monthPrefix = $"{yy}-{mm}-";

            var currentMonthNums = _db.Quotations
                .Where(q => q.QuoteNo != null && q.QuoteNo.StartsWith(monthPrefix))
                .Select(q => q.QuoteNo)
                .AsEnumerable()
                .Select(qno =>
                {
                    var parts = qno!.Split('-');
                    return parts.Length == 3 && int.TryParse(parts[2], out int n) ? n : 0;
                })
                .ToList();

            int maxSerial = currentMonthNums.Count > 0 ? currentMonthNums.Max() : 0;
            return maxSerial >= 9999 ? 1 : maxSerial + 1;
        }

        // GET /api/quotations/next-number  (preview only — does NOT reserve a number)
        [HttpGet("next-number")]
        public IActionResult GetNextQuoteNumber()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            int next = ComputeNextQuoteSerial();
            return Ok(new { nextNumber = $"{yy}-{mm}-{next:D4}" });
        }

        // GET /api/quotations
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var quotations = await _db.Quotations.ToListAsync();
            var result = quotations.Select(q => new
            {
                id = q.Id.ToString(),
                quoteNo = q.QuoteNo,
                clientName = q.ClientName,
                organizationName = q.OrganizationName,
                clientAddress = q.ClientAddress,
                projectTitle = q.ProjectTitle,
                workDescription = q.WorkDescription,
                date = q.Date,
                billType = q.BillType,
                items = JsonSerializer.Deserialize<JsonElement>(q.Items ?? "[]"),
                total = q.Total,
                status = q.Status,
                dealId = q.DealId
            });
            return Ok(result);
        }

        // POST /api/quotations
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] QuotationDto dto)
        {
            // Auto-generate quote number at save time to prevent gaps from abandoned drafts
            string assignedNo = dto.QuoteNo;
            if (string.IsNullOrWhiteSpace(assignedNo))
            {
                string yy = DateTime.Now.ToString("yy");
                string mm = DateTime.Now.ToString("MM");
                int next = ComputeNextQuoteSerial();
                assignedNo = $"{yy}-{mm}-{next:D4}";
            }

            // Try to find a matching CrmContact
            var contact = await _db.CrmContacts.FirstOrDefaultAsync(c => c.Name == dto.ClientName);
            if (contact == null)
            {
                contact = new CrmContact { Name = dto.ClientName, Status = "Cold", Source = "Other", Date = DateTime.Now.ToString("yyyy-MM-dd") };
                _db.CrmContacts.Add(contact);
                await _db.SaveChangesAsync(); // save to get Id
            }

            // Create linked Deal
            var deal = new Deal
            {
                Title = $"{dto.ProjectTitle} ({assignedNo})",
                Value = dto.Total,
                ContactId = contact.Id,
                Stage = "PROPOSAL",
                CloseDate = DateTime.Now.AddDays(30).ToString("yyyy-MM-dd")
            };
            _db.Deals.Add(deal);
            await _db.SaveChangesAsync();

            var q = new Quotation
            {
                QuoteNo = assignedNo,
                ClientName = dto.ClientName,
                OrganizationName = dto.OrganizationName ?? "",
                ClientAddress = dto.ClientAddress,
                ProjectTitle = dto.ProjectTitle,
                WorkDescription = dto.WorkDescription,
                Date = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date,
                BillType = dto.BillType,
                Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : "[]",
                Total = dto.Total,
                Status = "Pending",
                DealId = deal.Id
            };
            _db.Quotations.Add(q);
            await _db.SaveChangesAsync();
            return Ok(new { id = q.Id.ToString(), quoteNo = q.QuoteNo, message = "Quotation saved" });
        }

        // PUT /api/quotations/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] QuotationDto dto)
        {
            var q = await _db.Quotations.FindAsync(id);
            if (q == null) return NotFound();

            q.QuoteNo = dto.QuoteNo;
            q.ClientName = dto.ClientName;
            q.OrganizationName = dto.OrganizationName ?? q.OrganizationName;
            q.ClientAddress = dto.ClientAddress;
            q.ProjectTitle = dto.ProjectTitle;
            q.WorkDescription = dto.WorkDescription;
            q.Date = dto.Date;
            q.BillType = dto.BillType;
            q.Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : q.Items;
            q.Total = dto.Total;
            if (dto.Status != null) {
                q.Status = dto.Status;
            }

            // Sync with Deal
            if (q.DealId.HasValue)
            {
                var deal = await _db.Deals.FindAsync(q.DealId.Value);
                if (deal != null)
                {
                    deal.Value = dto.Total;
                    deal.Title = $"{dto.ProjectTitle} ({q.QuoteNo})";
                    deal.Stage = q.Status switch {
                        "Pending" => "PROPOSAL",
                        "Negotiating" => "NEGOTIATION",
                        "Approved" => "WON",
                        "Rejected" => "LOST",
                        _ => deal.Stage
                    };
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { id = q.Id.ToString(), quoteNo = q.QuoteNo, message = "Quotation updated" });
        }

        // DELETE /api/quotations/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var q = await _db.Quotations.FindAsync(id);
            if (q == null) return NotFound();
            _db.Quotations.Remove(q);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Quotation deleted" });
        }
    }
}
