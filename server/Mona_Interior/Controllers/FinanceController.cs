using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;
using System.Text.Json;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/finance")]
    public class FinanceController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public FinanceController(MonainteriorDbContext db) => _db = db;

        // ── INVOICES ─────────────────────────────────────────────────

        // Shared helper: compute next serial for YY-MM-XXXX within current month
        private int ComputeNextInvoiceSerial()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            string monthPrefix = $"INV-{mm}{yy}-";

            var currentMonthNums = _db.Invoices
                .Where(i => i.InvoiceNo != null && i.InvoiceNo.StartsWith(monthPrefix))
                .Select(i => i.InvoiceNo)
                .AsEnumerable()
                .Select(inv =>
                {
                    var parts = inv!.Split('-');
                    return parts.Length == 3 && int.TryParse(parts[2], out int n) ? n : 0;
                })
                .ToList();

            int maxSerial = currentMonthNums.Count > 0 ? currentMonthNums.Max() : 0;
            return maxSerial >= 9999 ? 1 : maxSerial + 1;
        }

        // GET /api/finance/invoices/next-number  (preview only — does NOT reserve a number)
        [HttpGet("invoices/next-number")]
        public IActionResult GetNextInvoiceNumber()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            int next = ComputeNextInvoiceSerial();
            return Ok(new { nextNumber = $"INV-{mm}{yy}-{next:D4}" });
        }

        // GET /api/finance/invoices
        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var invoices = await _db.Invoices.OrderByDescending(i => i.Date).ToListAsync();
            var result = invoices.Select(i => new
            {
                id = i.Id.ToString(),
                invoiceNo = i.InvoiceNo,
                invoiceDate = i.InvoiceDate,
                clientName = i.ClientName,
                clientAddress = i.ClientAddress,
                organizationName = i.OrganizationName,
                gstNumber = i.GstNumber,
                projectTitle = i.ProjectTitle,
                workDescription = i.WorkDescription,
                items = JsonSerializer.Deserialize<JsonElement>(i.Items ?? "{}"),
                total = i.Total,
                billType = i.BillType,
                status = i.Status,
                date = i.Date
            });
            return Ok(result);
        }

        // POST /api/finance/invoices
        [HttpPost("invoices")]
        public async Task<IActionResult> CreateInvoice([FromBody] InvoiceDto dto)
        {
            // Auto-generate invoice number at save time to prevent gaps from abandoned drafts
            string assignedNo = dto.InvoiceNo;
            if (string.IsNullOrWhiteSpace(assignedNo))
            {
                string yy = DateTime.Now.ToString("yy");
                string mm = DateTime.Now.ToString("MM");
                int next = ComputeNextInvoiceSerial();
                assignedNo = $"INV-{mm}{yy}-{next:D4}";
            }

            var rawDate = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date;
            if (!rawDate.Contains("T")) rawDate += "T" + DateTime.Now.ToString("HH:mm:ss");

            var inv = new Invoice
            {
                InvoiceNo = assignedNo,
                InvoiceDate = dto.InvoiceDate,
                ClientName = dto.ClientName,
                ClientAddress = dto.ClientAddress,
                OrganizationName = dto.OrganizationName ?? string.Empty,
                GstNumber = dto.GstNumber ?? string.Empty,
                ProjectTitle = dto.ProjectTitle,
                WorkDescription = dto.WorkDescription,
                Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : "{}",
                Total = dto.Total,
                BillType = dto.BillType,
                Status = dto.Status,
                Date = rawDate
            };
            _db.Invoices.Add(inv);
            await _db.SaveChangesAsync();
            return Ok(new { id = inv.Id.ToString(), invoiceNo = inv.InvoiceNo, message = "Invoice saved" });
        }

        // PUT /api/finance/invoices/{id}
        [HttpPut("invoices/{id}")]
        public async Task<IActionResult> UpdateInvoice(int id, [FromBody] InvoiceDto dto)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();

            if (!string.IsNullOrEmpty(dto.InvoiceDate) && !dto.InvoiceDate.Contains("T")) {
                if (!string.IsNullOrEmpty(inv.InvoiceDate) && inv.InvoiceDate.Contains("T")) {
                    dto.InvoiceDate = dto.InvoiceDate + "T" + inv.InvoiceDate.Split('T')[1];
                }
            }
            inv.InvoiceNo = dto.InvoiceNo;
            inv.InvoiceDate = dto.InvoiceDate;
            inv.ClientName = dto.ClientName;
            inv.ClientAddress = dto.ClientAddress;
            inv.OrganizationName = dto.OrganizationName ?? string.Empty;
            inv.GstNumber = dto.GstNumber ?? string.Empty;
            inv.ProjectTitle = dto.ProjectTitle;
            inv.WorkDescription = dto.WorkDescription;
            inv.Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : inv.Items;
            inv.Total = dto.Total;
            inv.BillType = dto.BillType;
            inv.Status = dto.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Invoice updated" });
        }

        // PATCH /api/finance/invoices/{id}/status — update payment status only
        [HttpPatch("invoices/{id}/status")]
        public async Task<IActionResult> UpdateInvoiceStatus(int id, [FromBody] JsonElement body)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();

            if (body.TryGetProperty("status", out var status))
                inv.Status = status.GetString() ?? inv.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Status updated" });
        }

        // DELETE /api/finance/invoices/{id}
        [HttpDelete("invoices/{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();
            _db.Invoices.Remove(inv);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Invoice deleted" });
        }

        // ── EXPENSES ─────────────────────────────────────────────────

        // GET /api/finance/expenses
        [HttpGet("expenses")]
        public async Task<IActionResult> GetExpenses()
        {
            var expenses = await _db.Expenses.OrderByDescending(e => e.Date).ToListAsync();
            var result = expenses.Select(e => new
            {
                id = e.Id.ToString(),
                date = e.Date,
                category = e.Category,
                description = e.Description,
                amount = e.Amount,
                clientId = e.ClientId,
                type = e.Type
            });
            return Ok(result);
        }

        // POST /api/finance/expenses
        [HttpPost("expenses")]
        public async Task<IActionResult> CreateExpense([FromBody] ExpenseDto dto)
        {
            var rawDate = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date;
            if (!rawDate.Contains("T")) rawDate += "T" + DateTime.Now.ToString("HH:mm:ss");

            var exp = new Expense
            {
                Date = rawDate,
                Category = dto.Category,
                Description = dto.Description,
                Amount = dto.Amount,
                ClientId = dto.ClientId,
                Type = dto.Type
            };
            _db.Expenses.Add(exp);
            await _db.SaveChangesAsync();
            return Ok(new { id = exp.Id.ToString(), message = "Expense recorded" });
        }

        // PUT /api/finance/expenses/{id}
        [HttpPut("expenses/{id}")]
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] ExpenseDto dto)
        {
            var exp = await _db.Expenses.FindAsync(id);
            if (exp == null) return NotFound();

            if (!string.IsNullOrEmpty(dto.Date) && !dto.Date.Contains("T")) {
                if (!string.IsNullOrEmpty(exp.Date) && exp.Date.Contains("T")) {
                    dto.Date = dto.Date + "T" + exp.Date.Split('T')[1];
                } else {
                    dto.Date = dto.Date + "T" + DateTime.Now.ToString("HH:mm:ss");
                }
            }
            exp.Date = dto.Date;
            exp.Category = dto.Category;
            exp.Description = dto.Description;
            exp.Amount = dto.Amount;
            exp.ClientId = dto.ClientId;
            exp.Type = dto.Type;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Expense updated" });
        }

        // DELETE /api/finance/expenses/{id}
        [HttpDelete("expenses/{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var exp = await _db.Expenses.FindAsync(id);
            if (exp == null) return NotFound();
            _db.Expenses.Remove(exp);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Expense deleted" });
        }

        // ── PAYROLL ──────────────────────────────────────────────────

        // GET /api/finance/payroll
        [HttpGet("payroll")]
        public async Task<IActionResult> GetPayroll()
        {
            var records = await _db.PayrollRecords.Where(p => p.Status != "Reversed").OrderByDescending(p => p.Year).ThenBy(p => p.Month).ToListAsync();
            var result = records.Select(p => new
            {
                id = p.Id.ToString(),
                employeeId = p.EmployeeId,
                month = p.Month,
                year = p.Year,
                baseSalary = p.BaseSalary,
                deductions = p.Deductions,
                netPay = p.NetPay,
                paidDate = p.PaidDate,
                status = p.Status,
                attendanceBreakdown = string.IsNullOrEmpty(p.AttendanceBreakdown)
                    ? (object)"{}"
                    : JsonSerializer.Deserialize<JsonElement>(p.AttendanceBreakdown)
            });
            return Ok(result);
        }

        // POST /api/finance/payroll
        [HttpPost("payroll")]
        public async Task<IActionResult> CreatePayroll([FromBody] PayrollDto dto)
        {
            var rawDate = string.IsNullOrEmpty(dto.PaidDate) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.PaidDate;
            if (!rawDate.Contains("T")) rawDate += "T" + DateTime.Now.ToString("HH:mm:ss");

            var record = new PayrollRecord
            {
                EmployeeId = dto.EmployeeId,
                Month = dto.Month,
                Year = dto.Year,
                BaseSalary = dto.BaseSalary,
                Deductions = dto.Deductions,
                NetPay = dto.NetPay,
                PaidDate = rawDate,
                Status = dto.Status,
                AttendanceBreakdown = dto.AttendanceBreakdown.HasValue
                    ? dto.AttendanceBreakdown.Value.GetRawText()
                    : "{}"
            };
            _db.PayrollRecords.Add(record);
            await _db.SaveChangesAsync();
            return Ok(new { id = record.Id.ToString(), message = "Payroll entry saved" });
        }

        // PUT /api/finance/payroll/{id}
        [HttpPut("payroll/{id}")]
        public async Task<IActionResult> UpdatePayroll(int id, [FromBody] PayrollDto dto)
        {
            var record = await _db.PayrollRecords.FindAsync(id);
            if (record == null) return NotFound();

            // Parse old and new attendance breakdown to find advance deductions
            decimal oldAdvance = 0;
            decimal newAdvance = 0;
            try {
                var oldEntry = JsonSerializer.Deserialize<JsonElement>(record.AttendanceBreakdown);
                if (oldEntry.TryGetProperty("advanceDeduction", out var oldAdvProp)) {
                    decimal.TryParse(oldAdvProp.GetString(), out oldAdvance);
                }
                if (oldEntry.TryGetProperty("amount", out var oldAdvAmtProp) && oldEntry.TryGetProperty("type", out var oldTypeProp) && oldTypeProp.GetString() == "Advance") {
                    decimal.TryParse(oldAdvAmtProp.GetString(), out oldAdvance);
                    oldAdvance = -oldAdvance; // Advance given increases balance
                }
            } catch {}

            try {
                if (dto.AttendanceBreakdown.HasValue) {
                    if (dto.AttendanceBreakdown.Value.TryGetProperty("advanceDeduction", out var newAdvProp)) {
                        decimal.TryParse(newAdvProp.GetString(), out newAdvance);
                    }
                    if (dto.AttendanceBreakdown.Value.TryGetProperty("amount", out var newAdvAmtProp) && dto.AttendanceBreakdown.Value.TryGetProperty("type", out var newTypeProp) && newTypeProp.GetString() == "Advance") {
                        decimal.TryParse(newAdvAmtProp.GetString(), out newAdvance);
                        newAdvance = -newAdvance;
                    }
                }
            } catch {}

            var emp = await _db.Employees.FindAsync(record.EmployeeId);
            if (emp != null) {
                // Revert old advance effect, apply new advance effect
                // If oldAdvance was 500 (deducted), we add 500 back. If newAdvance is 800, we subtract 800.
                emp.AdvanceBalance = emp.AdvanceBalance + oldAdvance - newAdvance;
            }

            record.BaseSalary = dto.BaseSalary;
            record.Deductions = dto.Deductions;
            record.NetPay = dto.NetPay;
            record.PaidDate = dto.PaidDate;
            record.AttendanceBreakdown = dto.AttendanceBreakdown.HasValue ? dto.AttendanceBreakdown.Value.GetRawText() : record.AttendanceBreakdown;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Payroll updated" });
        }

        // DELETE /api/finance/payroll/{id}
        [HttpDelete("payroll/{id}")]
        public async Task<IActionResult> DeletePayroll(int id)
        {
            var record = await _db.PayrollRecords.FindAsync(id);
            if (record == null) return NotFound();

            // Instead of deleting, mark as reversed so it shows as a Reversal Credit
            record.Status = "Reversed";

            // Refund advance if it was a salary deduction
            decimal advToRefund = 0;
            try {
                var entry = JsonSerializer.Deserialize<JsonElement>(record.AttendanceBreakdown);
                if (entry.TryGetProperty("advanceDeduction", out var advProp)) {
                    decimal.TryParse(advProp.GetString(), out advToRefund);
                }
                // If it was an advance issuance, delete means we remove the balance!
                if (entry.TryGetProperty("amount", out var advAmtProp) && entry.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "Advance") {
                    decimal.TryParse(advAmtProp.GetString(), out advToRefund);
                    advToRefund = -advToRefund; // Negate so it subtracts from balance
                }
            } catch {}

            var emp = await _db.Employees.FindAsync(record.EmployeeId);
            if (emp != null) {
                emp.AdvanceBalance = emp.AdvanceBalance + advToRefund;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Payroll reversed" });
        }

        // ── RECEIPTS ──────────────────────────────────────────────────

        [HttpGet("receipts")]
        public async Task<IActionResult> GetReceipts()
        {
            var receipts = await _db.PaymentReceipts.OrderByDescending(r => r.Date).ToListAsync();
            var result = receipts.Select(r => new
            {
                id = r.Id.ToString(),
                receiptNo = r.ReceiptNo,
                date = r.Date,
                siteId = r.SiteId,
                clientName = r.ClientName,
                totalAmount = r.TotalAmount,
                amountPaid = r.AmountPaid,
                remainingAmount = r.RemainingAmount,
                status = r.Status,
                category = r.Category,
                description = r.Description,
                comments = r.Comments,
                paymentMode = r.PaymentMode
            });
            return Ok(result);
        }

        private int ComputeNextReceiptSerial()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            string monthPrefix = $"RCP-{mm}{yy}-";

            var currentMonthNums = _db.PaymentReceipts
                .Where(r => r.ReceiptNo != null && r.ReceiptNo.StartsWith(monthPrefix))
                .Select(r => r.ReceiptNo)
                .AsEnumerable()
                .Select(r =>
                {
                    var parts = r!.Split('-');
                    return parts.Length == 3 && int.TryParse(parts[2], out int n) ? n : 0;
                })
                .ToList();

            int maxSerial = currentMonthNums.Count > 0 ? currentMonthNums.Max() : 0;
            return maxSerial >= 9999 ? 1 : maxSerial + 1;
        }

        [HttpGet("receipts/next-number")]
        public IActionResult GetNextReceiptNumber()
        {
            string yy = DateTime.Now.ToString("yy");
            string mm = DateTime.Now.ToString("MM");
            int next = ComputeNextReceiptSerial();
            return Ok(new { nextNumber = $"RCP-{mm}{yy}-{next:D4}" });
        }

        [HttpPost("receipts")]
        public async Task<IActionResult> CreateReceipt([FromBody] PaymentReceiptDto dto)
        {
            string assignedNo = dto.ReceiptNo;
            if (string.IsNullOrWhiteSpace(assignedNo) || assignedNo.StartsWith("MI/RCP/"))
            {
                string yy = DateTime.Now.ToString("yy");
                string mm = DateTime.Now.ToString("MM");
                int next = ComputeNextReceiptSerial();
                assignedNo = $"RCP-{mm}{yy}-{next:D4}";
            }

            var rawDate = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date;
            if (!rawDate.Contains("T")) rawDate += "T" + DateTime.Now.ToString("HH:mm:ss");

            var r = new PaymentReceipt
            {
                ReceiptNo = assignedNo,
                Date = rawDate,
                SiteId = dto.SiteId,
                ClientName = dto.ClientName,
                TotalAmount = dto.TotalAmount,
                AmountPaid = dto.AmountPaid,
                RemainingAmount = dto.RemainingAmount,
                Status = dto.Status,
                Category = dto.Category,
                Description = dto.Description,
                Comments = dto.Comments,
                PaymentMode = dto.PaymentMode
            };
            _db.PaymentReceipts.Add(r);
            await _db.SaveChangesAsync();
            return Ok(new { id = r.Id.ToString(), message = "Receipt saved" });
        }

        [HttpPut("receipts/{id}")]
        public async Task<IActionResult> UpdateReceipt(int id, [FromBody] PaymentReceiptDto dto)
        {
            var r = await _db.PaymentReceipts.FindAsync(id);
            if (r == null) return NotFound();

            if (!string.IsNullOrEmpty(dto.Date) && !dto.Date.Contains("T")) {
                if (!string.IsNullOrEmpty(r.Date) && r.Date.Contains("T")) {
                    dto.Date = dto.Date + "T" + r.Date.Split('T')[1];
                } else {
                    dto.Date = dto.Date + "T" + DateTime.Now.ToString("HH:mm:ss");
                }
            }
            r.ReceiptNo = dto.ReceiptNo;
            r.Date = dto.Date;
            r.SiteId = dto.SiteId;
            r.ClientName = dto.ClientName;
            r.TotalAmount = dto.TotalAmount;
            r.AmountPaid = dto.AmountPaid;
            r.RemainingAmount = dto.RemainingAmount;
            r.Status = dto.Status;
            r.Category = dto.Category;
            r.Description = dto.Description;
            r.Comments = dto.Comments;
            r.PaymentMode = dto.PaymentMode;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Receipt updated" });
        }

        [HttpDelete("receipts/{id}")]
        public async Task<IActionResult> DeleteReceipt(int id)
        {
            var r = await _db.PaymentReceipts.FindAsync(id);
            if (r == null) return NotFound();
            _db.PaymentReceipts.Remove(r);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Receipt deleted" });
        }

        // ── ACCOUNTS (Computed Ledger) ────────────────────────────────

        // GET /api/finance/accounts
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var receipts = await _db.PaymentReceipts.ToListAsync();
            var expenses = await _db.Expenses.ToListAsync();
            var payroll = await _db.PayrollRecords.ToListAsync();

            var ledgerEntries = receipts.Select(r => new
            {
                id = "rcp-" + r.Id,
                date = r.Date,
                type = "Credit",
                category = "Project Income",
                description = $"Receipt #{r.ReceiptNo} — {r.ClientName}",
                amount = r.AmountPaid
            }).AsEnumerable().Concat(expenses.Select(e => new
            {
                id = "exp-" + e.Id,
                date = e.Date,
                type = (e.Type == "Bank Credit" || e.Type == "Credit") ? "Credit" : "Debit",
                category = e.Category,
                description = e.Description,
                amount = e.Amount
            })).Concat(payroll.Select(p => new
            {
                id = "pay-" + p.Id,
                date = p.PaidDate,
                type = "Debit",
                category = "Employee Payroll",
                description = $"Payroll — Employee ID {p.EmployeeId} ({p.Month} {p.Year})",
                amount = p.NetPay
            })).ToList();

            var reversedPayroll = payroll.Where(p => p.Status == "Reversed").Select(p => new
            {
                id = "payrev-" + p.Id,
                date = p.PaidDate,
                type = "Credit",
                category = "Employee Payroll",
                description = $"Payroll Reversal — Employee ID {p.EmployeeId} ({p.Month} {p.Year})",
                amount = p.NetPay
            }).ToList();

            ledgerEntries = ledgerEntries.Concat(reversedPayroll).OrderByDescending(e => e.date).ToList();

            return Ok(ledgerEntries);
        }
    }
}
