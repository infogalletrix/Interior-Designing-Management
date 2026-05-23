using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public AttendanceController(MonainteriorDbContext db) => _db = db;

        // GET /api/attendance
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? employeeId, [FromQuery] string? month)
        {
            var query = _db.AttendanceRecords.AsQueryable();
            if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);
            if (!string.IsNullOrEmpty(month)) query = query.Where(a => a.Date.StartsWith(month));
            var records = await query.ToListAsync();
            return Ok(records.Select(a => new { id = a.Id, employeeId = a.EmployeeId, date = a.Date, status = a.Status }));
        }

        // POST /api/attendance — upsert (same employee+date => update)
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] AttendanceDto dto)
        {
            var existing = await _db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == dto.Date);
            if (existing != null)
                existing.Status = dto.Status;
            else
                _db.AttendanceRecords.Add(new AttendanceRecord { EmployeeId = dto.EmployeeId, Date = dto.Date, Status = dto.Status });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Attendance saved" });
        }

        // DELETE /api/attendance/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var r = await _db.AttendanceRecords.FindAsync(id);
            if (r == null) return NotFound();
            _db.AttendanceRecords.Remove(r);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Deleted" });
        }
    }
}
