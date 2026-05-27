import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  CalendarDays,
  Calendar,
  Clock,
  Save,
  BarChart3,
  Users,
  FileText,
  FileSpreadsheet,
  Lock,
  Unlock,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useDialog } from "../contexts/DialogContext";
import NotificationWidget from "../components/NotificationWidget";

export default function AttendancePage() {
  const { showDialog } = useDialog();
  // --- STATE ---
  const today = new Date().toISOString().split("T")[0];
  
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { 'YYYY-MM-DD': { isLocked: bool, records: { empId: { status, overtime } } } }
  
  const [activeTab, setActiveTab] = useState("daily"); // daily, history, weekly, monthly
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedWeekStart, setSelectedWeekStart] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7)); // YYYY-MM
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  
  // Daily / History specific state
  const [currentRecords, setCurrentRecords] = useState({}); // { empId: { status, overtime } }
  const [isLocked, setIsLocked] = useState(false);
  
  const loadData = async () => {
    try {
      const empRes = await fetch('/api/employees');
      const empData = await empRes.json();
      setEmployees(empData);

      const attRes = await fetch('/api/attendance');
      const attData = await attRes.json();
      
      const lockedDays = JSON.parse(localStorage.getItem('attendanceLockedDays') || '{}');
      const groupedData = {};
      
      attData.forEach(r => {
        if (!groupedData[r.date]) {
          groupedData[r.date] = { isLocked: lockedDays[r.date] || false, records: {} };
        }
        groupedData[r.date].records[r.employeeId] = { status: r.status, overtime: r.overtime || 0 };
      });
      
      setAttendanceData(groupedData);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync currentRecords when date or tab changes, or data loads
  useEffect(() => {
    if (activeTab === "daily" || activeTab === "history") {
      const dateToUse = activeTab === "daily" ? today : selectedDate;
      if (activeTab === "daily") setSelectedDate(today);

      if (attendanceData[dateToUse]) {
        setCurrentRecords(attendanceData[dateToUse].records);
        setIsLocked(attendanceData[dateToUse].isLocked);
      } else {
        // Initialize default (everyone present, 0 OT)
        const defaults = {};
        employees.forEach(emp => {
          defaults[emp.id] = { status: "present", overtime: 0 };
        });
        setCurrentRecords(defaults);
        setIsLocked(false);
      }
    }
  }, [activeTab, selectedDate, attendanceData, employees, today]);

  // Set default week start (Monday of current week)
  useEffect(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    setSelectedWeekStart(monday.toISOString().split("T")[0]);
  }, []);

  // --- ACTIONS ---
  const saveAttendance = async (lock = false) => {
    const payload = Object.keys(currentRecords).map(empId => ({
      employeeId: parseInt(empId),
      date: selectedDate,
      status: currentRecords[empId].status,
      overtime: currentRecords[empId].overtime || 0
    }));

    try {
      await fetch('/api/attendance/batch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      const lockedDays = JSON.parse(localStorage.getItem('attendanceLockedDays') || '{}');
      lockedDays[selectedDate] = lock;
      localStorage.setItem('attendanceLockedDays', JSON.stringify(lockedDays));

      const newData = { 
        ...attendanceData, 
        [selectedDate]: { isLocked: lock, records: currentRecords } 
      };
      setAttendanceData(newData);
      setIsLocked(lock);
      showDialog({ title: "Success", message: lock ? "Attendance Locked!" : "Attendance Saved!", type: "success" });
    } catch (e) { console.error(e); }
  };

  const handleUnlock = async () => {
    try {
      const lockedDays = JSON.parse(localStorage.getItem('attendanceLockedDays') || '{}');
      lockedDays[selectedDate] = false;
      localStorage.setItem('attendanceLockedDays', JSON.stringify(lockedDays));

      const newData = { 
        ...attendanceData, 
        [selectedDate]: { ...attendanceData[selectedDate], isLocked: false } 
      };
      setAttendanceData(newData);
      setIsLocked(false);
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = (empId, status) => {
    if (isLocked) return;
    setCurrentRecords(prev => ({
      ...prev,
      [empId]: { ...prev[empId], status }
    }));
  };

  const handleOvertimeChange = (empId, overtime) => {
    if (isLocked) return;
    setCurrentRecords(prev => ({
      ...prev,
      [empId]: { ...prev[empId], overtime: Number(overtime) || 0 }
    }));
  };

  const markAllPresent = () => {
    if (isLocked) return;
    const updated = {};
    employees.forEach(emp => {
      updated[emp.id] = { ...currentRecords[emp.id], status: "present" };
    });
    setCurrentRecords(updated);
  };

  // --- AGGREGATION LOGIC ---
  const getWeeklyData = () => {
    if (!selectedWeekStart) return [];
    
    // Generate dates for the week (Mon to Sun)
    const dates = [];
    let start = new Date(selectedWeekStart);
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(start).toISOString().split("T")[0]);
      start.setDate(start.getDate() + 1);
    }
    
    return employees.map(emp => {
      let presentDays = 0;
      let totalOT = 0;
      dates.forEach(d => {
        const entry = attendanceData[d];
        if (entry && entry.records && entry.records[emp.id]) {
          const record = entry.records[emp.id];
          if (record.status === "present" || record.status === "half-day") {
            presentDays += record.status === "half-day" ? 0.5 : 1;
          }
          totalOT += Number(record.overtime) || 0;
        }
      });
      return { ...emp, presentDays, totalOT };
    });
  };

  const getMonthlyData = () => {
    if (!selectedMonth) return [];
    const year = parseInt(selectedMonth.split("-")[0]);
    const month = parseInt(selectedMonth.split("-")[1]) - 1; // 0-indexed
    
    const numDays = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= numDays; i++) {
      const dStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dates.push(dStr);
    }

    return employees.map(emp => {
      let presentDays = 0;
      let totalOT = 0;
      dates.forEach(d => {
        const entry = attendanceData[d];
        if (entry && entry.records && entry.records[emp.id]) {
          const record = entry.records[emp.id];
          if (record.status === "present" || record.status === "half-day") {
            presentDays += record.status === "half-day" ? 0.5 : 1;
          }
          totalOT += Number(record.overtime) || 0;
        }
      });
      return { ...emp, presentDays, totalOT, workingDays: numDays };
    });
  };

  // --- FILTERING ---
  const activeEmployees = employees.filter(e => e.status === "Active");

  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm);
    const matchesRole =
      roleFilter === "All Roles" || emp.role === roleFilter;
    
    if (activeTab === "daily" || activeTab === "history") {
      const record = currentRecords[emp.id];
      const status = record ? record.status : "absent";
      const matchesStatus = statusFilter === "All Status" || status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    }
    return matchesSearch && matchesRole;
  });

  // --- SUMMARY STATS ---
  const presentCount = activeEmployees.filter(e => currentRecords[e.id]?.status === "present").length;
  const halfDayCount = activeEmployees.filter(e => currentRecords[e.id]?.status === "half-day").length;
  const absentCount = activeEmployees.length - presentCount - halfDayCount;

  // --- EXPORT LOGIC ---
  const generateExportData = () => {
    const header = [];
    const rows = [];
    
    if (activeTab === "daily" || activeTab === "history") {
      header.push("Name", "Phone", "Role", "Status", "Overtime (Hrs)");
      filteredEmployees.forEach(emp => {
        const rec = currentRecords[emp.id] || { status: "absent", overtime: 0 };
        rows.push([emp.name, emp.phone, emp.role, rec.status.toUpperCase(), rec.overtime || 0]);
      });
    } else if (activeTab === "weekly") {
      header.push("Name", "Role", "Days Present", "Total OT (Hrs)");
      const data = getWeeklyData().filter(emp => 
        (searchTerm === "" || emp.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (roleFilter === "All Roles" || emp.role === roleFilter)
      );
      data.forEach(emp => {
        rows.push([emp.name, emp.role, emp.presentDays, emp.totalOT]);
      });
    } else if (activeTab === "monthly") {
      header.push("Name", "Role", "Days Present", "Working Days", "Total OT (Hrs)");
      const data = getMonthlyData().filter(emp => 
        (searchTerm === "" || emp.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (roleFilter === "All Roles" || emp.role === roleFilter)
      );
      data.forEach(emp => {
        rows.push([emp.name, emp.role, emp.presentDays, emp.workingDays, emp.totalOT]);
      });
    }
    
    return { header, rows };
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const { header, rows } = generateExportData();
    let title = "Attendance Report";
    if (activeTab === "daily" || activeTab === "history") title += ` - ${selectedDate}`;
    if (activeTab === "weekly") title += ` - Week of ${selectedWeekStart}`;
    if (activeTab === "monthly") title += ` - Month of ${selectedMonth}`;

    doc.setFontSize(16);
    doc.text(title, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [header],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    });

    doc.save(`Attendance_Report_${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    const { header, rows } = generateExportData();
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `Attendance_Report_${Date.now()}.xlsx`);
  };

  // --- RENDER HELPERS ---
  const StatCard = ({ title, value, color, icon: Icon }) => (
    <div className="themed-card p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
      <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-widest">
        {title}
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <div className={`text-4xl font-black ${color}`}>{value}</div>
    </div>
  );

  const StatusToggle = ({ value, onChange, disabled }) => (
    <div className="flex bg-white/10 rounded-xl p-1 w-fit gap-1">
      <button
        onClick={() => onChange("present")}
        disabled={disabled}
        className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${value === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'text-muted hover:text-themed disabled:opacity-50 hover:bg-white/10'}`}
      >
        P
      </button>
      <button
        onClick={() => onChange("half-day")}
        disabled={disabled}
        className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${value === 'half-day' ? 'bg-amber-500 text-white shadow-md' : 'text-muted hover:text-themed disabled:opacity-50 hover:bg-white/10'}`}
      >
        HD
      </button>
      <button
        onClick={() => onChange("absent")}
        disabled={disabled}
        className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${value === 'absent' ? 'bg-red-500 text-white shadow-md' : 'text-muted hover:text-themed disabled:opacity-50 hover:bg-white/10'}`}
      >
        A
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 page-wrapper">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-3 gap-2 relative z-50">
        <div>
          <h1 className="text-xl font-black text-themed tracking-tight flex items-center gap-2">
            <Users className="text-[#C9A227]" size={18} />
            Attendance Management
          </h1>
          <p className="text-muted font-medium text-xs mt-0.5">
            Track daily attendance, overtime, and export reports.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl font-bold text-sm hover:bg-rose-500/20 transition-colors"
          >
            <FileText size={16} /> Export PDF
          </button>
          <button 
            onClick={exportExcel}
            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-colors"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <NotificationWidget />
        </div>
      </div>

      {/* TABS */}
      <div className="flex space-x-2 mb-4 border-b border-[var(--border-color)] pb-1">
        {[
          { id: "daily", label: "Daily Entry", icon: Clock },
          { id: "history", label: "Date History", icon: CalendarDays },
          { id: "weekly", label: "Weekly Summary", icon: Calendar },
          { id: "monthly", label: "Monthly Summary", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-[var(--bg-card)] text-[#C9A227] border-t-2 border-l border-r border-[var(--border-color)] shadow-sm translate-y-[1px]"
                : "text-muted hover:text-themed hover:bg-white/5"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DYNAMIC CONTENT BASED ON TAB */}
      {(activeTab === "daily" || activeTab === "history") && (
        <>
          {/* STATS & ACTIONS FOR DAILY/HISTORY */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="themed-card p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Selected Date
              </div>
              <div className="relative flex items-center gap-2">
                <CalendarDays className="text-[#C9A227]" size={20} />
                <input
                  type="date"
                  value={selectedDate}
                  max={activeTab === "history" ? today : undefined}
                  readOnly={activeTab === "daily"}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`w-full text-lg font-black bg-transparent outline-none ${activeTab === "history" ? "cursor-pointer focus:text-[#C9A227]" : "text-slate-400 cursor-not-allowed"}`}
                />
              </div>
            </div>
            <StatCard title="Present" value={presentCount} color="text-emerald-500" />
            <StatCard title="Half Day" value={halfDayCount} color="text-amber-500" />
            <StatCard title="Absent" value={absentCount} color="text-red-500" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 themed-card p-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={markAllPresent}
                disabled={isLocked}
                className="text-xs font-bold text-[#C9A227] hover:underline disabled:opacity-50 disabled:hover:no-underline px-2"
              >
                Mark All Present
              </button>
              {isLocked && (
                <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLocked ? (
                <button
                  onClick={handleUnlock}
                  className="bg-white/5 text-muted border border-[var(--border-color)] px-4 py-2 text-sm rounded-xl font-bold flex items-center gap-1.5 transition hover:bg-white/10"
                >
                  <Unlock size={16} /> Unlock Edits
                </button>
              ) : (
                <>
                  <button
                    onClick={() => saveAttendance(false)}
                    className="bg-[#C9A227]/10 text-[#C9A227] px-4 py-2 text-sm rounded-xl font-bold flex items-center gap-1.5 transition hover:bg-[#C9A227]/20"
                  >
                    <Save size={16} /> Save Draft
                  </button>
                  <button
                    onClick={() => saveAttendance(true)}
                    className="bg-[#C9A227] text-white px-4 py-2 text-sm rounded-xl font-bold shadow-md flex items-center gap-1.5 transition hover:bg-[#B8911F]"
                  >
                    <Lock size={16} /> Save & Lock
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "weekly" && (
        <div className="themed-card p-4 rounded-2xl shadow-sm mb-4 flex items-center gap-3 max-w-sm">
          <Calendar className="text-[#C9A227]" size={20} />
          <div className="flex-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Select Week (Starts Monday)
            </div>
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="w-full text-base font-black bg-transparent outline-none cursor-pointer focus:text-[#C9A227]"
            />
          </div>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="themed-card p-4 rounded-2xl shadow-sm mb-4 flex items-center gap-3 max-w-sm">
          <BarChart3 className="text-[#C9A227]" size={20} />
          <div className="flex-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Select Month
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-base font-black bg-transparent outline-none cursor-pointer focus:text-[#C9A227]"
            />
          </div>
        </div>
      )}

      {/* DATA TABLE AREA */}
      <div className="themed-card p-6 rounded-3xl shadow-sm">
        {/* COMMON FILTERS */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 themed-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="relative w-40">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2.5 themed-input rounded-xl appearance-none text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option>All Roles</option>
                {[...new Set(employees.map(e => e.role))].map(role => (
                   <option key={role}>{role}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            {(activeTab === "daily" || activeTab === "history") && (
              <div className="relative w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 themed-input rounded-xl appearance-none text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option>All Status</option>
                  <option value="present">PRESENT</option>
                  <option value="half-day">HALF-DAY</option>
                  <option value="absent">ABSENT</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            )}
          </div>
        </div>

        {/* TABLE REPEATER */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-muted uppercase tracking-[0.2em] border-b border-[var(--border-color)] themed-thead">
                <th className="px-4 py-4">Staff Details</th>
                <th className="px-4 py-4">Role</th>
                
                {(activeTab === "daily" || activeTab === "history") && (
                  <>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Overtime (Hrs)</th>
                  </>
                )}
                
                {activeTab === "weekly" && (
                  <>
                    <th className="px-4 py-4 text-center">Days Present (Week)</th>
                    <th className="px-4 py-4 text-center">Total OT (Week)</th>
                  </>
                )}

                {activeTab === "monthly" && (
                  <>
                    <th className="px-4 py-4 text-center">Days Present (Month)</th>
                    <th className="px-4 py-4 text-center">Total OT (Month)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y themed-divider">
              {activeTab === "daily" || activeTab === "history" ? (
                // DAILY / HISTORY VIEW
                filteredEmployees.map((emp) => {
                  const record = currentRecords[emp.id] || { status: "absent", overtime: 0 };
                  return (
                    <tr key={emp.id} className="group themed-row">
                      <td className="px-4 py-3">
                        <div className="font-black text-themed text-sm">{emp.name}</div>
                        <div className="text-[11px] font-bold text-muted">{emp.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-muted bg-[var(--accent-soft)] border border-[var(--border-color)] px-2.5 py-1 rounded-md">{emp.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusToggle 
                          value={record.status} 
                          onChange={(val) => handleStatusChange(emp.id, val)}
                          disabled={isLocked}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 max-w-[100px]">
                          <input 
                            type="text"
                            inputMode="decimal" pattern="^\d*\.?\d*$"
                            min="0"
                            max="24"
                            step="0.5"
                            value={record.overtime || ""}
                            onChange={(e) => handleOvertimeChange(emp.id, e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
                            disabled={isLocked}
                            placeholder="0"
                            className="w-full p-1.5 border border-[var(--border-color)] rounded-lg themed-input font-bold text-xs outline-none focus:border-[#C9A227] transition-colors disabled:opacity-50"
                          />
                          <span className="text-[10px] font-bold text-slate-400">hrs</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : activeTab === "weekly" ? (
                // WEEKLY VIEW
                getWeeklyData().filter(emp => 
                  (searchTerm === "" || emp.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (roleFilter === "All Roles" || emp.role === roleFilter)
                ).map(emp => (
                  <tr key={emp.id} className="group themed-row">
                    <td className="px-4 py-3">
                      <div className="font-black text-themed text-sm">{emp.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-muted bg-[var(--accent-soft)] border border-[var(--border-color)] px-2.5 py-1 rounded-md">{emp.role}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 font-black text-base border border-emerald-500/20">
                        {emp.presentDays}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 font-black text-base border border-amber-500/20">
                        {emp.totalOT}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // MONTHLY VIEW
                getMonthlyData().filter(emp => 
                  (searchTerm === "" || emp.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (roleFilter === "All Roles" || emp.role === roleFilter)
                ).map(emp => (
                  <tr key={emp.id} className="group themed-row">
                    <td className="px-4 py-3">
                      <div className="font-black text-themed text-sm">{emp.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-muted bg-[var(--accent-soft)] border border-[var(--border-color)] px-2.5 py-1 rounded-md">{emp.role}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-base border border-emerald-500/20">
                          {emp.presentDays}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">/ {emp.workingDays}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center min-w-[3.5rem] px-3 h-10 rounded-xl bg-amber-500/10 text-amber-500 font-black text-base border border-amber-500/20">
                        {emp.totalOT} hrs
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {(employees.length === 0 || filteredEmployees.length === 0) && activeTab !== "weekly" && activeTab !== "monthly" && (
             <div className="py-16 text-center text-slate-400 font-bold text-sm">
               No staff found.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
