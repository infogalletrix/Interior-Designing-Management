using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/employees")]
    public class EmployeesController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public EmployeesController(MonainteriorDbContext db) => _db = db;

        private int ComputeNextWorkerSerial()
        {
            var ids = _db.Employees
                .Where(e => e.WorkerId != null && e.WorkerId.StartsWith("EMP-"))
                .Select(e => e.WorkerId)
                .AsEnumerable()
                .Select(w =>
                {
                    var parts = w!.Split('-');
                    return parts.Length == 2 && int.TryParse(parts[1], out int n) ? n : 0;
                })
                .ToList();
            int maxSerial = ids.Count > 0 ? ids.Max() : 0;
            return maxSerial + 1;
        }

        [HttpGet("next-id")]
        public IActionResult GetNextWorkerId()
        {
            int next = ComputeNextWorkerSerial();
            return Ok(new { nextWorkerId = $"EMP-{next:D4}" });
        }

        // GET /api/employees
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var employees = await _db.Employees.ToListAsync();
            var result = employees.Select(e => new
            {
                id = e.Id,
                name = e.Name,
                role = e.Role,
                department = e.Department,
                phone = e.Phone,
                email = e.Email,
                salary = e.Salary,
                joinDate = e.JoinDate,
                status = e.Status,
                address = e.Address,
                advanceBalance = e.AdvanceBalance,
                bankDetails = e.BankDetails,
                govId = e.GovId,
                salaryType = e.SalaryType,
                workerId = e.WorkerId
            });
            return Ok(result);
        }

        // GET /api/employees/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var e = await _db.Employees.FindAsync(id);
            if (e == null) return NotFound();
            return Ok(new
            {
                id = e.Id,
                name = e.Name,
                role = e.Role,
                department = e.Department,
                phone = e.Phone,
                email = e.Email,
                salary = e.Salary,
                joinDate = e.JoinDate,
                status = e.Status,
                address = e.Address,
                advanceBalance = e.AdvanceBalance,
                bankDetails = e.BankDetails,
                govId = e.GovId,
                salaryType = e.SalaryType,
                workerId = e.WorkerId
            });
        }

        // POST /api/employees
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmployeeDto dto)
        {
            string assignedId = dto.WorkerId;
            if (string.IsNullOrWhiteSpace(assignedId) || assignedId.StartsWith("MONA-"))
            {
                int next = ComputeNextWorkerSerial();
                assignedId = $"EMP-{next:D4}";
            }

            var emp = new Employee
            {
                Name = dto.Name,
                Role = dto.Role,
                Department = dto.Department ?? "",
                Phone = dto.Phone,
                Email = dto.Email ?? "",
                Salary = dto.Salary,
                JoinDate = string.IsNullOrEmpty(dto.JoinDate)
                    ? DateTime.Now.ToString("yyyy-MM-dd")
                    : dto.JoinDate,
                Status = dto.Status,
                Address = dto.Address ?? "",
                AdvanceBalance = dto.AdvanceBalance,
                BankDetails = dto.BankDetails ?? "",
                GovId = dto.GovId ?? "",
                SalaryType = dto.SalaryType ?? "Monthly",
                WorkerId = assignedId
            };
            _db.Employees.Add(emp);
            await _db.SaveChangesAsync();
            return Ok(new { id = emp.Id, message = "Employee added" });
        }

        // PUT /api/employees/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] EmployeeDto dto)
        {
            var emp = await _db.Employees.FindAsync(id);
            if (emp == null) return NotFound();

            emp.Name = dto.Name;
            emp.Role = dto.Role;
            emp.Department = dto.Department ?? "";
            emp.Phone = dto.Phone;
            emp.Email = dto.Email ?? "";
            emp.Salary = dto.Salary;
            emp.JoinDate = dto.JoinDate;
            emp.Status = dto.Status;
            emp.Address = dto.Address ?? "";
            emp.AdvanceBalance = dto.AdvanceBalance;
            emp.BankDetails = dto.BankDetails ?? "";
            emp.GovId = dto.GovId ?? "";
            emp.SalaryType = dto.SalaryType ?? "Monthly";
            emp.WorkerId = dto.WorkerId ?? "";

            await _db.SaveChangesAsync();
            return Ok(new { message = "Employee updated" });
        }

        // DELETE /api/employees/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var emp = await _db.Employees.FindAsync(id);
            if (emp == null) return NotFound();
            _db.Employees.Remove(emp);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Employee deleted" });
        }
    }
}
