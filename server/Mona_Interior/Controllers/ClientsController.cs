using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;

namespace Mona_Interior.Controllers
{
    [ApiController] // Move this here
    [Route("api/[controller]")]
    public class ClientsController : ControllerBase // Add ': ControllerBase' here
    {
        private readonly MonainteriorDbContext _context;

        // You MUST add this constructor to connect the database
        public ClientsController(MonainteriorDbContext context)
        {
            _context = context;
        }

        [HttpPost("insert")]
        public async Task<ActionResult> PostClient(ClientCreateDto clientDto)
        {
            // 1. Convert DTO to Model (Manual Mapping)
            var client = new Client
            {
                FullName = clientDto.FullName,
                PhoneNumber = clientDto.PhoneNumber,
                EmailAddress = clientDto.EmailAddress,
                ProjectFocus = clientDto.ProjectFocus,
                LeadSource = clientDto.LeadSource
            };

            // 2. Save to DB
            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            return Ok("Client saved successfully!");
        }

        [HttpPatch("update/{id}")]
        public async Task<IActionResult> UpdateClient(int id, ClientCreateDto updateDto)
        {
            var existingClient = await _context.Clients.FindAsync(id);

            if (existingClient == null)
            {
                return NotFound();
            }

            // Update the existing model with new DTO values
            existingClient.FullName = updateDto.FullName;
            existingClient.PhoneNumber = updateDto.PhoneNumber;
            existingClient.EmailAddress = updateDto.EmailAddress;
            existingClient.ProjectFocus = updateDto.ProjectFocus;
            existingClient.LeadSource = updateDto.LeadSource;

            await _context.SaveChangesAsync();

            return Ok("Client updated successfully!");
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Client>> GetClient(int id)
        {
            var client = await _context.Clients.FindAsync(id);

            if (client == null)
            {
                return NotFound();
            }

            return client;
        }

        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<Client>>> GetClients()
        {
            // Returns the raw database models directly
            return await _context.Clients.ToListAsync();
        }

        // URL: api/clients/search?name=p
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Client>>> SearchByName([FromQuery] string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest("Search term cannot be empty.");
            }
            // This filters the database for names containing the search string
            // EF Core translates this to SQL: WHERE "FullName" LIKE '%p%'
            var results = await _context.Clients
                .Where(c => c.FullName.ToLower().Contains(name.ToLower()))
                .ToListAsync();

            return Ok(results);
        }


    }
}