import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PayslipDocument from "../components/PayslipDocument";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wallet, X, ChevronRight, CheckCircle2, Clock,
  Search, Printer, CalendarDays, User, CreditCard, Banknote,
  MessageCircle, Eye, Send
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryPage() {
  const { showDialog } = useDialog();
  const today = new Date();
  
  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[today.getMonth()]);
  const [selectedYear] = useState(today.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [printData, setPrintData] = useState(null);
  const [viewPayslip, setViewPayslip] = useState(null); // payroll entry to preview
  
  // UI States
  const [actionType, setActionType] = useState("Salary"); // "Salary" | "Advance"
  const [historyTab, setHistoryTab] = useState("Salary"); // "Salary" | "Advance"

  // Load Data
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        setEmployees(data);
      } catch (err) { console.error(err); }
    };
    const fetchPayroll = async () => {
      try {
        const res = await fetch('/api/finance/payroll');
        const data = await res.json();
        // Restore the full React entry state from the attendanceBreakdown JSON object
        const restoredHistory = data.map(d => ({
          ...d.attendanceBreakdown,
          id: d.id || d.attendanceBreakdown?.id,
        })).filter(d => d.type); // ensure it's a valid history item
        setPayrollHistory(restoredHistory);
      } catch (err) { console.error(err); }
    };
    
    fetchEmployees();
    fetchPayroll();
  }, []);

  const saveEmployees = async (emps) => {
    setEmployees(emps);
  };

  const saveHistory = async (hist) => {
    setPayrollHistory(hist);
  };

  // Forms
  const [salForm, setSalForm] = useState({
    paidDays: "30",
    lopDays: "0",
    basic: "",
    otHours: "",
    otRate: "",
    advanceDeduction: "",
    otherDeductions: "",
    method: "Bank Transfer",
    paidOn: today.toISOString().split("T")[0],
  });

  const [advForm, setAdvForm] = useState({
    amount: "",
    method: "Bank Transfer",
    paidOn: today.toISOString().split("T")[0],
  });

  const componentRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  // Dynamic Calculation for Basic based on Wage Type
  useEffect(() => {
    if (selectedEmployee && actionType === "Salary") {
      let calcBasic = 0;
      if (selectedEmployee.salaryType === "Daily") {
        const days = parseFloat(salForm.paidDays || 0);
        calcBasic = parseFloat(selectedEmployee.salary || 0) * days;
      } else {
        calcBasic = parseFloat(selectedEmployee.salary || 0);
      }
      
      setSalForm(f => ({
        ...f,
        basic: calcBasic.toString(),
        advanceDeduction: selectedEmployee.advanceBalance > 0 ? selectedEmployee.advanceBalance.toString() : "0"
      }));
    }
  }, [selectedEmployee, salForm.paidDays, actionType]);

  // Salary Calculations
  const basic = parseFloat(salForm.basic || 0);
  const otPayment = parseFloat(salForm.otHours || 0) * parseFloat(salForm.otRate || 0);
  const totalEarnings = basic + otPayment;
  const advanceDed = parseFloat(salForm.advanceDeduction || 0);
  const otherDed = parseFloat(salForm.otherDeductions || 0);
  const totalDeductions = advanceDed + otherDed;
  const netPay = totalEarnings - totalDeductions;

  const handleSelectEmployee = async (emp) => {
    setSelectedEmployee(emp);
    setActionType("Salary");
    
    // Automatically calculate paidDays and otHours based on attendance
    let computedPaidDays = 30; // fallback
    let computedOtHours = 0;
    try {
      const monthStr = (MONTHS.indexOf(selectedMonth) + 1).toString().padStart(2, '0');
      const yearMonth = `${selectedYear}-${monthStr}`;
      
      const res = await fetch(`/api/attendance?employeeId=${emp.id}&month=${yearMonth}`);
      if (res.ok) {
        const attData = await res.json();
        
        // Total days in the selected month
        const daysInMonth = new Date(selectedYear, MONTHS.indexOf(selectedMonth) + 1, 0).getDate();
        
        // Count absences (Half-Day counts as full day for salary)
        const absentDays = attData.filter(d => d.status?.toLowerCase() === "absent").length;
        
        // Sum Overtime hours
        computedOtHours = attData.reduce((sum, d) => sum + (Number(d.overtime) || 0), 0);
        
        if (emp.salaryType === "Daily") {
          // For Daily wages, only count days explicitly marked as present or half-day
          const presentDays = attData.filter(d => 
            d.status?.toLowerCase() === "present" || d.status?.toLowerCase() === "half-day"
          ).length;
          computedPaidDays = presentDays;
        } else {
          // For Monthly wages, assume full month minus explicitly marked absences
          computedPaidDays = daysInMonth - absentDays;
        }
      }
    } catch (e) {
      console.error("Failed to fetch attendance for paidDays calc", e);
    }

    setSalForm(f => ({
      ...f,
      paidDays: computedPaidDays.toString(),
      otHours: computedOtHours > 0 ? computedOtHours.toString() : "",
      otRate: "",
      otherDeductions: "",
    }));
    setAdvForm(f => ({
      ...f,
      amount: "",
    }));
  };

  const handleProcessSalary = async (e, shouldPrint = true) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (advanceDed > (selectedEmployee.advanceBalance || 0)) {
      showDialog({
        title: "Warning",
        message: `You are deducting ₹${advanceDed} for advances, but the employee's outstanding advance balance is only ₹${selectedEmployee.advanceBalance || 0}. Continue?`,
        type: "confirm",
        onConfirm: () => executeProcessSalary(shouldPrint)
      });
      return;
    }
    executeProcessSalary(shouldPrint);
  };

  const executeProcessSalary = async (shouldPrint) => {
    const entry = {
      id: `PR-SAL-${Date.now()}`,
      type: "Salary",
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      role: selectedEmployee.role,
      month: selectedMonth,
      year: selectedYear,
      basic,
      otHours: parseFloat(salForm.otHours || 0),
      otRate: parseFloat(salForm.otRate || 0),
      otPayment,
      advanceDeduction: advanceDed,
      otherDeductions: otherDed,
      netPay,
      paidDays: salForm.paidDays,
      lopDays: salForm.lopDays,
      paidOn: salForm.paidOn,
      method: salForm.method,
    };

    const payload = {
      employeeId: selectedEmployee.id,
      month: selectedMonth,
      year: selectedYear,
      baseSalary: basic,
      deductions: totalDeductions,
      netPay,
      paidDate: salForm.paidOn,
      status: "Paid",
      attendanceBreakdown: entry
    };

    try {
      const res = await fetch('/api/finance/payroll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      const savedEntry = { ...entry, id: data.id || entry.id };
      saveHistory([savedEntry, ...payrollHistory]);

      if (advanceDed > 0) {
        const newBalance = Math.max(0, (selectedEmployee.advanceBalance || 0) - advanceDed);
        await fetch(`/api/employees/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...selectedEmployee, advanceBalance: newBalance})
        });
        const updatedEmps = employees.map(emp => {
          if (emp.id === selectedEmployee.id) {
            return { ...emp, advanceBalance: newBalance };
          }
          return emp;
        });
        saveEmployees(updatedEmps);
      }

      if (shouldPrint) {
        const pd = {
          name: selectedEmployee.name,
          gender: "Male",
          paidDays: salForm.paidDays,
          lopDays: salForm.lopDays,
          basic: salForm.basic,
          otHours: salForm.otHours,
          otRate: salForm.otRate,
          advance: salForm.advanceDeduction,
          otherDeductions: salForm.otherDeductions,
        };
        setPrintData(pd);
        setTimeout(() => handlePrint(), 300);
      }

      showDialog({ title: "Success", message: `Salary of ${selectedMonth} ${selectedYear} processed successfully for ${selectedEmployee.name}.`, type: "success" });
      setSelectedEmployee(null);
    } catch(err) { console.error(err); }
  };

  const handleGiveAdvance = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    const amt = parseFloat(advForm.amount || 0);
    if (amt <= 0) {
      showDialog({ title: "Invalid", message: "Enter a valid advance amount.", type: "alert" });
      return;
    }

    const entry = {
      id: `PR-ADV-${Date.now()}`,
      type: "Advance",
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      month: selectedMonth,
      year: selectedYear,
      amount: amt,
      paidOn: advForm.paidOn,
      method: advForm.method,
    };

    const payload = {
      employeeId: selectedEmployee.id,
      month: selectedMonth,
      year: selectedYear,
      baseSalary: 0,
      deductions: 0,
      netPay: amt,
      paidDate: advForm.paidOn,
      status: "Paid",
      attendanceBreakdown: entry
    };

    try {
      const res = await fetch('/api/finance/payroll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      const savedEntry = { ...entry, id: data.id || entry.id };
      saveHistory([savedEntry, ...payrollHistory]);

      const newBalance = (selectedEmployee.advanceBalance || 0) + amt;
      await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...selectedEmployee, advanceBalance: newBalance})
      });
      const updatedEmps = employees.map(emp => {
        if (emp.id === selectedEmployee.id) {
          return { ...emp, advanceBalance: newBalance };
        }
        return emp;
      });
      saveEmployees(updatedEmps);
      showDialog({ title: "Success", message: `Advance of ₹${amt} for ${selectedMonth} ${selectedYear} paid to ${selectedEmployee.name}.`, type: "success" });
      setSelectedEmployee(null);
    } catch(err) { console.error(err); }
  };

  const salaryHistory = payrollHistory.filter(
    (p) => p.type === "Salary" && p.month === selectedMonth && p.year === selectedYear
  );
  
  const advanceHistory = payrollHistory.filter(
    (p) => p.type === "Advance" && p.month === selectedMonth && p.year === selectedYear
  );

  const totalSalaryPaid = salaryHistory.reduce((s, p) => s + p.netPay, 0);
  const totalAdvancePaid = advanceHistory.reduce((s, p) => s + p.amount, 0);

  const alreadyPaidSalary = (emp) => {
    if (emp.salaryType === "Daily") {
      return salaryHistory.some((p) => p.employeeId === emp.id && p.paidOn === salForm.paidOn);
    }
    return salaryHistory.some((p) => p.employeeId === emp.id);
  };

  // PDF + WHATSAPP HELPERS
  const generatePayslipPDF = (h) => {
    const doc = new jsPDF({ unit: "pt", format: "a5" });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MONA INTERIOR STUDIO", W / 2, 28, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("PAYSLIP", W / 2, 44, { align: "center" });
    doc.setFontSize(8);
    doc.text(`${h.month} ${h.year}`, W / 2, 58, { align: "center" });

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(h.employeeName, 30, 92);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${h.role || ""}   |   Paid on: ${h.paidOn}   |   Via: ${h.method}   |   Days: ${h.paidDays || 30}`, 30, 108);

    const earnings = [
      ["Basic Pay", `Rs. ${(h.basic || 0).toLocaleString()}`],
    ];
    if (h.otPayment > 0) {
      earnings.push([`OT Pay (${h.otHours} hrs x Rs.${h.otRate}/hr)`, `Rs. ${h.otPayment.toLocaleString()}`]);
    }

    const deductions = [];
    if (h.advanceDeduction > 0) deductions.push(["Advance Recovery", `- Rs. ${h.advanceDeduction.toLocaleString()}`]);
    if (h.otherDeductions > 0) deductions.push(["Other Deductions", `- Rs. ${h.otherDeductions.toLocaleString()}`]);

    doc.autoTable({
      startY: 122,
      head: [["Earnings", "Amount"]],
      body: earnings,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 30, right: 30 },
    });

    if (deductions.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Deductions", "Amount"]],
        body: deductions,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 9, textColor: [180, 0, 0] },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: 30, right: 30 },
      });
    }

    const netY = doc.lastAutoTable.finalY + 16;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(30, netY, W - 60, 36, 6, 6, "F");
    doc.setTextColor(5, 150, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NET PAY", 44, netY + 14);
    doc.setFontSize(14);
    doc.text(`Rs. ${h.netPay.toLocaleString()}`, W - 44, netY + 23, { align: "right" });

    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("This is a system-generated payslip. Mona Interior Studio.", W / 2, netY + 58, { align: "center" });

    const filename = `Payslip_${h.employeeName.replace(/\s+/g, "_")}_${h.month}_${h.year}.pdf`;
    doc.save(filename);
    return filename;
  };

  const sendWhatsApp = (h, phone) => {
    const filename = generatePayslipPDF(h);
    const cleaned = (phone || "").replace(/\D/g, "");
    const num = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    const msg =
      `Hi ${h.employeeName},\n\nPlease find your payslip for *${h.month} ${h.year}* attached.\n\n*Net Pay: Rs. ${h.netPay.toLocaleString()}*\n\n_Mona Interior Studio_`;
    setTimeout(() => {
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    }, 600);
  };

  const sendBulkWhatsApp = () => {
    if (salaryHistory.length === 0) {
      showDialog({ title: "No Records", message: "No salary records for this month to send.", type: "alert" });
      return;
    }
    const eligible = salaryHistory.filter(h => {
      const emp = employees.find(e => e.id === h.employeeId);
      return !!emp?.phone;
    });
    if (eligible.length === 0) {
      showDialog({ title: "No Contacts", message: "No employees with phone numbers found.", type: "alert" });
      return;
    }
    eligible.forEach((h, i) => {
      const emp = employees.find(e => e.id === h.employeeId);
      setTimeout(() => sendWhatsApp(h, emp.phone), i * 1200);
    });
  };

  // Glassmorphism design tokens
  const glassCard = "themed-card shadow-xl";
  const inputClass = "w-full p-2.5 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition";
  const labelClass = "text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block ml-1";

  const filteredEmployees = employees.filter(emp =>
    emp.status === "Active" && (
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  return (
    <div className="p-4 md:p-6 page-wrapper">


      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4"
      >
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2 tracking-tight">
            <Wallet size={20} className="text-violet-400" />
            Payroll &amp; Advances
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">
            Process regular salaries, manage daily wages, and track advances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendBulkWhatsApp}
            className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg font-bold text-xs transition shadow-sm"
            title="Send payslips to all paid employees this month via WhatsApp"
          >
            <MessageCircle size={14} /> Bulk WhatsApp
          </button>
          
          <div className="flex items-center gap-1.5 themed-card rounded-lg px-3 py-1.5 shadow-sm">
            <CalendarDays size={14} className="text-slate-400" />
            <select
              className="text-xs font-black text-themed outline-none bg-transparent cursor-pointer [&>option]:bg-[var(--modal-bg)]"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <span className="text-violet-400 font-bold text-xs ml-1">{selectedYear}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        {/* LEFT: Employee Roster + Actions */}
        <div className="xl:col-span-5 space-y-6 h-[calc(100vh-180px)] flex flex-col">
          
          {/* Employee Roster */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`${glassCard} rounded-[28px] flex flex-col flex-1 overflow-hidden`}
          >
            <div className="p-4 border-b border-[var(--border-color)] themed-thead space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-themed flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Users size={16} className="text-violet-400" />
                  Select Staff
                </h3>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-xs transition"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredEmployees.length === 0 && <p className="p-8 text-center text-sm text-slate-400 font-bold">No employees found.</p>}
              <div className="p-3 space-y-2">
                {filteredEmployees.map((emp) => {
                  const paidSal = alreadyPaidSalary(emp);
                  const isSelected = selectedEmployee?.id === emp.id;
                  return (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all border ${
                        isSelected 
                          ? "bg-violet-500/20 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]" 
                          : "themed-card border-transparent hover:border-[var(--border-color)]"
                      }`}
                    >
                      <div>
                        <p className="font-black text-themed text-sm flex items-center gap-2">
                          {emp.name} {paidSal && <CheckCircle2 size={16} className="text-emerald-400" title="Salary Processed" />}
                        </p>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                          {emp.role} • {emp.salaryType} (₹{emp.salary})
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {emp.advanceBalance > 0 && (
                          <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                            Adv: ₹{emp.advanceBalance}
                          </span>
                        )}
                        <ChevronRight size={16} className={isSelected ? "text-violet-400" : "text-slate-600"} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Action Form */}
          <AnimatePresence mode="wait">
            {selectedEmployee && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="themed-card rounded-[28px] overflow-hidden shrink-0 shadow-lg"
              >
                <div className="p-5 flex justify-between items-center border-b border-[var(--border-color)] themed-thead">
                  <div>
                    <h3 className="font-black text-xl text-themed tracking-tight">{selectedEmployee.name}</h3>
                    <p className="text-violet-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {selectedEmployee.salaryType} Wage
                    </p>
                  </div>
                  <button onClick={() => setSelectedEmployee(null)} className="p-2 themed-card hover:border-[var(--border-color)] rounded-full text-muted hover:text-themed transition">
                    <X size={18}/>
                  </button>
                </div>

                {/* Action Tabs */}
                <div className="flex border-b border-[var(--border-color)] themed-thead">
                  <button
                    onClick={() => setActionType("Salary")}
                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition relative ${
                      actionType === "Salary" ? "text-violet-500" : "text-muted hover:text-themed"
                    }`}
                  >
                    <Banknote size={16}/> Process Salary
                    {actionType === "Salary" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_10px_#8b5cf6]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActionType("Advance")}
                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition relative ${
                      actionType === "Advance" ? "text-amber-500" : "text-muted hover:text-themed"
                    }`}
                  >
                    <CreditCard size={16}/> Give Advance
                    {actionType === "Advance" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
                    )}
                  </button>
                </div>

                {/* SALARY FORM */}
                {actionType === "Salary" && (
                  <motion.form 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onSubmit={handleProcessSalary} className="p-4 space-y-3 max-h-[42vh] overflow-y-auto no-scrollbar"
                  >
                    {alreadyPaidSalary(selectedEmployee) && (
                      <div className="mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16}/> Salary already processed for {selectedEmployee.salaryType === "Daily" ? "this date" : "this month"}.
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>Paid Days</label>
                        <input type="text" inputMode="numeric" pattern="^\d*$" className="w-full p-2 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition" value={salForm.paidDays} onChange={(e) => setSalForm({...salForm, paidDays: e.target.value.replace(/\D/g, '')})} />
                      </div>
                      <div>
                        <label className={labelClass}>Basic (Editable)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                          <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" required className="w-full p-2 pl-8 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition" value={salForm.basic} onChange={(e) => setSalForm({...salForm, basic: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} />
                        </div>
                      </div>
                    </div>

                    <div className="themed-card p-3 rounded-2xl mb-3">
                      <p className={labelClass}>Overtime Config</p>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" placeholder="OT Hours" className="w-full p-2 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition" value={salForm.otHours} onChange={(e) => setSalForm({...salForm, otHours: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} />
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                          <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" placeholder="OT Rate / hr" className="w-full p-2 pl-8 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition" value={salForm.otRate} onChange={(e) => setSalForm({...salForm, otRate: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className={labelClass}>Advance Deduct</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                          <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" className="w-full p-2 pl-8 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition text-amber-500" value={salForm.advanceDeduction} onChange={(e) => setSalForm({...salForm, advanceDeduction: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Other Deduct</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                          <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" className="w-full p-2 pl-8 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition text-red-500" value={salForm.otherDeductions} onChange={(e) => setSalForm({...salForm, otherDeductions: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center justify-between themed-card rounded-2xl p-4">
                      <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Net Payable</p>
                        <p className="text-2xl font-black text-emerald-400 tracking-tighter">₹{netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <motion.button 
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          type="button" disabled={alreadyPaidSalary(selectedEmployee)} 
                          onClick={(e) => handleProcessSalary(e, false)}
                          className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition text-themed shadow-sm"
                        >
                          <CheckCircle2 size={16}/> Pay
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          type="button" disabled={alreadyPaidSalary(selectedEmployee)} 
                          onClick={(e) => handleProcessSalary(e, true)}
                          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition shadow-[0_0_20px_rgba(139,92,246,0.3)] text-white"
                        >
                          <Printer size={16}/> Pay & Print
                        </motion.button>
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* ADVANCE FORM */}
                {actionType === "Advance" && (
                  <motion.form 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onSubmit={handleGiveAdvance} className="p-4 space-y-3 no-scrollbar"
                  >
                    <div className="mb-3">
                      <label className={labelClass}>Advance Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-base font-bold">₹</span>
                        <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" required className="w-full p-2.5 pl-9 text-base border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold transition text-amber-500" value={advForm.amount} onChange={(e) => setAdvForm({...advForm, amount: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className={labelClass}>Method</label>
                        <select className="w-full p-2.5 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition [&>option]:bg-[var(--modal-bg)]" value={advForm.method} onChange={(e) => setAdvForm({...advForm, method: e.target.value})}>
                          <option>Bank Transfer</option><option>Cash</option><option>UPI</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Date</label>
                        <input type="date" required className="w-full p-2.5 border border-[var(--border-color)] rounded-xl themed-input outline-none focus:border-violet-500 font-bold text-sm transition" value={advForm.paidOn} onChange={(e) => setAdvForm({...advForm, paidOn: e.target.value})} />
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    >
                      Issue Advance
                    </motion.button>
                  </motion.form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: History & Logs */}
        <div className="xl:col-span-7 h-[calc(100vh-180px)] flex flex-col gap-6">
          {/* Summary Cards */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-6 shrink-0"
          >
            <div className="themed-card border border-violet-500/30 p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 text-violet-500/20"><Wallet size={120} /></div>
              <p className="text-violet-500 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Total Salary Paid ({selectedMonth})</p>
              <h2 className="text-4xl font-black text-themed tracking-tighter relative z-10">₹{totalSalaryPaid.toLocaleString()}</h2>
            </div>
            <div className="themed-card border border-amber-500/30 p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 text-amber-500/10"><CreditCard size={120} /></div>
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Advances Given ({selectedMonth})</p>
              <h2 className="text-4xl font-black text-themed tracking-tighter relative z-10">₹{totalAdvancePaid.toLocaleString()}</h2>
            </div>
          </motion.div>

          {/* History Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${glassCard} rounded-[28px] flex flex-col flex-1 overflow-hidden`}
          >
            <div className="flex border-b border-[var(--border-color)] themed-thead shrink-0">
              <button onClick={() => setHistoryTab("Salary")} className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition relative ${historyTab === "Salary" ? "text-violet-500" : "text-muted hover:text-themed"}`}>
                Salary Logs
                {historyTab === "Salary" && <motion.div layoutId="historyTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />}
              </button>
              <button onClick={() => setHistoryTab("Advance")} className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition relative ${historyTab === "Advance" ? "text-amber-500" : "text-muted hover:text-themed"}`}>
                Advance Logs
                {historyTab === "Advance" && <motion.div layoutId="historyTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {historyTab === "Salary" && (
                <table className="w-full text-left border-collapse">
                  <thead className="themed-thead sticky top-0 z-10">
                    <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)]">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-4 py-4 text-right">Basic</th>
                      <th className="px-4 py-4 text-right">OT Pay</th>
                      <th className="px-4 py-4 text-right">Deducted</th>
                      <th className="px-6 py-4 text-right">Net Pay</th>
                      <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-divider">
                    {salaryHistory.length === 0 && (
                      <tr><td colSpan="6" className="py-16 text-center text-muted font-bold text-sm">No salaries processed this month.</td></tr>
                    )}
                    <AnimatePresence>
                      {salaryHistory.map((h) => {
                        const emp = employees.find(e => e.id === h.employeeId);
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key={h.id} className="themed-row transition group"
                          >
                            <td className="px-6 py-4">
                              <p className="font-black text-themed text-sm">{h.employeeName}</p>
                              <p className="text-[10px] text-muted font-bold tracking-wider mt-0.5">{h.paidOn}</p>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-themed">₹{h.basic.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right font-bold text-blue-400">{h.otPayment > 0 ? `₹${h.otPayment.toLocaleString()}` : "-"}</td>
                            <td className="px-4 py-4 text-right font-bold text-red-400">{(h.advanceDeduction + h.otherDeductions) > 0 ? `₹${(h.advanceDeduction + h.otherDeductions).toLocaleString()}` : "-"}</td>
                            <td className="px-6 py-4 text-right font-black text-emerald-400 text-lg">₹{h.netPay.toLocaleString()}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => setViewPayslip(h)}
                                  title="View Payslip"
                                  className="p-2.5 bg-violet-500/10 hover:bg-violet-500/30 text-violet-400 rounded-xl transition"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => sendWhatsApp(h, emp?.phone || "")}
                                  title={emp?.phone ? `Send to ${emp.phone}` : "No phone on record"}
                                  disabled={!emp?.phone}
                                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <MessageCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}

              {historyTab === "Advance" && (
                <table className="w-full text-left border-collapse">
                  <thead className="themed-thead sticky top-0 z-10">
                    <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)]">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-divider">
                    {advanceHistory.length === 0 && (
                      <tr><td colSpan="4" className="py-16 text-center text-muted font-bold text-sm">No advances issued this month.</td></tr>
                    )}
                    <AnimatePresence>
                      {advanceHistory.map((h) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          key={h.id} className="themed-row transition"
                        >
                          <td className="px-6 py-5 text-xs font-bold text-muted">{h.paidOn}</td>
                          <td className="px-6 py-5 font-black text-themed text-sm">{h.employeeName}</td>
                          <td className="px-6 py-5 text-[10px] font-bold text-muted uppercase tracking-widest">
                            <span className="themed-card px-2 py-1 rounded-md">{h.method}</span>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-amber-400 text-lg">₹{h.amount.toLocaleString()}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hidden Print */}
      {printData && (
        <div className="opacity-0 fixed top-0 left-0 pointer-events-none z-[-1]">
          <PayslipDocument ref={componentRef} data={printData} />
        </div>
      )}

      {/* VIEW PAYSLIP MODAL */}
      <AnimatePresence>
        {viewPayslip && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="themed-modal rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="p-6 flex justify-between items-center border-b border-[var(--border-color)] relative z-10">
                <div>
                  <h3 className="font-black text-xl text-themed">Payslip Details</h3>
                  <p className="text-violet-400 text-[10px] font-bold mt-1 uppercase tracking-widest">
                    {viewPayslip.month} {viewPayslip.year}
                  </p>
                </div>
                <button onClick={() => setViewPayslip(null)} className="p-2 themed-card hover:border-[var(--border-color)] rounded-full text-muted hover:text-themed transition">
                  <X size={20}/>
                </button>
              </div>

              <div className="themed-card px-6 py-5 relative z-10">
                <p className="font-black text-themed text-lg">{viewPayslip.employeeName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {viewPayslip.role} · Paid on {viewPayslip.paidOn} via {viewPayslip.method}
                </p>
              </div>

              <div className="p-6 space-y-4 relative z-10">
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">Earnings</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-themed">Basic Pay ({viewPayslip.paidDays} days)</span>
                  <span className="text-base font-black text-themed">₹{(viewPayslip.basic || 0).toLocaleString()}</span>
                </div>
                {viewPayslip.otPayment > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-themed">OT Pay ({viewPayslip.otHours}h × ₹{viewPayslip.otRate})</span>
                    <span className="text-base font-black text-blue-400">₹{viewPayslip.otPayment.toLocaleString()}</span>
                  </div>
                )}
                
                {(viewPayslip.advanceDeduction > 0 || viewPayslip.otherDeductions > 0) && (
                  <>
                    <div className="h-px bg-[var(--border-color)] my-4" />
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Deductions</p>
                    {viewPayslip.advanceDeduction > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-300">Advance Recovery</span>
                        <span className="text-base font-black text-red-400">- ₹{viewPayslip.advanceDeduction.toLocaleString()}</span>
                      </div>
                    )}
                    {viewPayslip.otherDeductions > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-300">Other Deductions</span>
                        <span className="text-base font-black text-red-400">- ₹{viewPayslip.otherDeductions.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="h-px bg-white/10 my-4" />
                <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Net Pay</span>
                  <span className="text-3xl font-black text-emerald-400">₹{viewPayslip.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3 relative z-10">
                <button
                  onClick={() => {
                    const emp = employees.find(e => e.id === viewPayslip.employeeId);
                    sendWhatsApp(viewPayslip, emp?.phone || "");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 py-3 rounded-2xl font-black text-sm transition"
                >
                  <MessageCircle size={18} /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    setPrintData({
                      name: viewPayslip.employeeName,
                      gender: "Male",
                      paidDays: viewPayslip.paidDays,
                      lopDays: viewPayslip.lopDays,
                      basic: viewPayslip.basic,
                      otHours: viewPayslip.otHours,
                      otRate: viewPayslip.otRate,
                      advance: viewPayslip.advanceDeduction,
                      otherDeductions: viewPayslip.otherDeductions,
                    });
                    setTimeout(() => handlePrint(), 300);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] py-3 rounded-2xl font-black text-sm transition"
                >
                  <Printer size={18} /> Print
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
