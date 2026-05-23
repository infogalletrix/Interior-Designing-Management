import React, { useState, useEffect } from "react";
import {
  Edit2, Trash2, Phone, Mail, MapPin, Plus, X, ArrowLeft,
  Calendar, CreditCard, User, Users, Search, ChevronDown,
  LayoutGrid, List, FileText, FileSpreadsheet, Building,
  Briefcase
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useDialog } from "../contexts/DialogContext";

const EmployeesPage = () => {
  const { showDialog } = useDialog();
  const generateWorkerId = () =>
    `MONA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const [employees, setEmployees] = useState([]);
  
  // View states
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  
  // Selection/Modal states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    address: "",
    salary: "",
    salaryType: "Monthly",
    status: "Active",
    bankDetails: "",
    govId: "",
  });

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
      })
      .catch(console.error);
  }, []);

  const saveToStorage = async (updatedEmployees, deletedId = null) => {
    if (deletedId) {
      try {
        await fetch(`/api/employees/${deletedId}`, { method: 'DELETE' });
        setEmployees(updatedEmployees);
      } catch (e) { console.error(e); }
    } else {
      setEmployees(updatedEmployees);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        ...(formData.advanceBalance !== undefined && { 
          advanceBalance: parseFloat(formData.advanceBalance) || 0 
        })
      };

      if (editingId) {
        const empToUpdate = employees.find(e => e.id === editingId);
        const finalPayload = { ...payload, workerId: empToUpdate.workerId };
        
        const res = await fetch(`/api/employees/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });

        if (res.ok) {
          const updated = employees.map((emp) => 
            emp.id === editingId ? { ...emp, ...finalPayload } : emp
          );
          setEmployees(updated);
          closeModal();
        } else {
          const errorData = await res.json().catch(() => ({}));
          showDialog({ title: "Error", message: `Failed to update employee: ${errorData.message || res.statusText || "Unknown error"}`, type: "error" });
        }
      } else {
        const finalPayload = { ...payload, workerId: generateWorkerId() };
        
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });

        if (res.ok) {
          const result = await res.json();
          const finalNewEmp = { ...finalPayload, id: result.id || Date.now() };
          setEmployees([...employees, finalNewEmp]);
          closeModal();
        } else {
          const errorData = await res.json().catch(() => ({}));
          showDialog({ title: "Error", message: `Failed to create employee: ${errorData.message || res.statusText || "Unknown error"}`, type: "error" });
        }
      }
    } catch (error) {
      console.error("Submit Error:", error);
      showDialog({ title: "Network Error", message: "A network error occurred while saving. Please check your connection.", type: "error" });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: "", role: "", phone: "", email: "", address: "",
      salary: "", salaryType: "Monthly", status: "Active",
      bankDetails: "", govId: "",
    });
  };

  // --- FILTERING ---
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm) ||
      (emp.workerId && emp.workerId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "All Roles" || emp.role === roleFilter;
    const matchesStatus = statusFilter === "All Status" || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // --- STATS ---
  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.status === "Active").length;
  const inactiveCount = totalEmployees - activeCount;
  const totalMonthlyPayroll = employees
    .filter(e => e.status === "Active" && e.salaryType === "Monthly")
    .reduce((acc, emp) => acc + Number(emp.salary), 0);

  // --- EXPORTS ---
  const generateExportData = () => {
    const header = ["ID", "Name", "Role", "Phone", "Email", "Status", "Salary Type", "Salary (INR)"];
    const rows = filteredEmployees.map(emp => [
      emp.workerId, emp.name, emp.role, emp.phone, emp.email || "-", emp.status, emp.salaryType, emp.salary
    ]);
    return { header, rows };
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const { header, rows } = generateExportData();
    doc.setFontSize(16);
    doc.text("Employee Directory", 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [header],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`Employees_Report_${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    const { header, rows } = generateExportData();
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, `Employees_Report_${Date.now()}.xlsx`);
  };

  // --- PROFILE VIEW ---
  if (selectedEmployee) {
    return (
      <div className="p-6 page-wrapper min-h-screen font-sans relative">
        <button
          onClick={() => setSelectedEmployee(null)}
          className="flex items-center gap-2 text-muted hover:text-indigo-500 mb-6 font-bold text-sm transition"
        >
          <ArrowLeft size={16} /> Back to Staff List
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="themed-card rounded-[32px] p-8 text-center shadow-sm">
              <div className="w-24 h-24 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-500/20 shadow-md">
                <User size={40} />
              </div>
              <h2 className="text-2xl font-black text-themed mb-1">{selectedEmployee.name}</h2>
              <p className="text-indigo-500 font-bold text-xs tracking-widest uppercase mb-4">
                {selectedEmployee.role}
              </p>
              <div className="inline-block px-3 py-1 bg-[var(--accent-soft)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-muted mb-4">
                ID: {selectedEmployee.workerId}
              </div>
              <div className="flex justify-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  selectedEmployee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {selectedEmployee.status}
                </span>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {selectedEmployee.salaryType}
                </span>
              </div>
            </div>

            <div className="themed-card rounded-[32px] p-6 shadow-sm">
              <h3 className="font-black text-themed text-sm mb-4 flex items-center gap-2">
                <Phone size={16} className="text-indigo-500" /> Contact &amp; Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-muted text-sm font-medium">
                  <Phone size={16} className="mt-0.5 text-muted shrink-0" /> 
                  <div>{selectedEmployee.phone}</div>
                </div>
                <div className="flex items-start gap-3 text-muted text-sm font-medium">
                  <Mail size={16} className="mt-0.5 text-muted shrink-0" /> 
                  <div>{selectedEmployee.email || "No email provided"}</div>
                </div>
                <div className="flex items-start gap-3 text-muted text-sm font-medium">
                  <MapPin size={16} className="mt-0.5 text-muted shrink-0" /> 
                  <div>{selectedEmployee.address}</div>
                </div>
                <hr className="border-[var(--border-color)] my-2" />
                <div className="flex items-start gap-3 text-muted text-sm font-medium">
                  <Building size={16} className="mt-0.5 text-muted shrink-0" /> 
                  <div>{selectedEmployee.bankDetails || "No bank details"}</div>
                </div>
                <div className="flex items-start gap-3 text-muted text-sm font-medium">
                  <CreditCard size={16} className="mt-0.5 text-muted shrink-0" /> 
                  <div>{selectedEmployee.govId || "No Gov ID"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
               <div className="themed-card p-6 rounded-[32px] shadow-sm flex flex-col justify-between h-28">
                 <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Base Salary</div>
                 <div className="text-3xl font-black text-themed">₹{selectedEmployee.salary}</div>
               </div>
               <div className="themed-card p-6 rounded-[32px] shadow-sm flex flex-col justify-between h-28">
                 <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Advance Balance</div>
                 <div className={`text-3xl font-black ${selectedEmployee.advanceBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                   ₹{selectedEmployee.advanceBalance || 0}
                 </div>
               </div>
            </div>

            <div className="themed-card rounded-[32px] overflow-hidden shadow-sm">
              <div className="p-6 px-8 border-b border-[var(--border-color)] flex items-center gap-3 font-black text-themed">
                <CreditCard size={18} className="text-indigo-500" /> Payment History
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead className="themed-thead sticky top-0">
                    <tr className="text-muted text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-3">Date</th>
                      <th className="px-8 py-3">Method</th>
                      <th className="px-8 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-divider">
                    {selectedEmployee.payments && selectedEmployee.payments.length > 0 ? (
                      selectedEmployee.payments.map((p) => (
                        <tr key={p.id} className="themed-row">
                          <td className="px-8 py-4 text-themed font-bold text-sm">{p.date}</td>
                          <td className="px-8 py-4 text-muted text-xs font-bold">{p.method}</td>
                          <td className="px-8 py-4 text-right font-black text-emerald-500">₹{p.amount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-8 py-8 text-center text-muted font-bold text-sm">No payment history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-4 md:p-6 page-wrapper">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-indigo-600" size={18} />
            Staff Directory
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-0.5">
            Manage employee profiles, roles, and payroll setups.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
          >
            <FileText size={16} /> PDF
          </button>
          <button 
            onClick={exportExcel}
            className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition ml-2"
          >
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Staff" value={totalEmployees} color="text-white" icon={Users} />
        <StatCard title="Active" value={activeCount} color="text-emerald-500" />
        <StatCard title="Inactive" value={inactiveCount} color="text-rose-500" />
        <StatCard title="Monthly Payroll" value={`₹${totalMonthlyPayroll.toLocaleString()}`} color="text-indigo-600" icon={Briefcase} />
      </div>

      {/* CONTROLS */}
      <div className="themed-card p-4 rounded-3xl shadow-sm mb-6 flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by name, ID or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 themed-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-40">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-2 themed-input rounded-xl appearance-none text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option>All Roles</option>
              {[...new Set(employees.map(e => e.role))].map(role => (
                  <option key={role}>{role}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          <div className="relative flex-1 lg:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 themed-input rounded-xl appearance-none text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option>All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
          </div>

          <div className="flex bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--bg-card)] shadow-sm text-indigo-500' : 'text-muted hover:text-themed'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-card)] shadow-sm text-indigo-500' : 'text-muted hover:text-themed'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* DIRECTORY VIEW */}
      {viewMode === "list" ? (
        <div className="themed-card rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.1em] border-b border-white/10">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role & Status</th>
                  <th className="px-6 py-4">Salary Setup</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-divider">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="group themed-row">
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedEmployee(emp)} className="block font-black text-themed text-sm hover:text-indigo-500 transition text-left">
                        {emp.name}
                      </button>
                      <div className="flex items-center gap-1 text-muted text-[10px] font-bold mt-0.5">
                        {emp.workerId}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-themed font-bold text-xs">{emp.phone}</div>
                      {emp.email && <div className="text-muted text-[10px] mt-0.5">{emp.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-themed font-bold text-xs mb-1">{emp.role}</div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-themed font-black text-sm">₹{emp.salary}</div>
                      <div className="text-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        {emp.salaryType}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setFormData(emp); setEditingId(emp.id); setIsModalOpen(true); }}
                          className="text-muted hover:text-indigo-500 transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            showDialog({
                              title: "Delete Employee",
                              message: "Are you sure you want to delete this employee?",
                              type: "confirm",
                              onConfirm: () => {
                                const updated = employees.filter((e) => e.id !== emp.id);
                                saveToStorage(updated, emp.id);
                              }
                            });
                          }}
                          className="text-muted hover:text-rose-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="py-16 text-center text-slate-400 font-bold text-sm">No employees match your search.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="themed-card rounded-[24px] p-5 shadow-sm hover:shadow-md transition flex flex-col h-full relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] p-1 rounded-lg shadow-sm border border-[var(--border-color)]">
                <button onClick={() => { setFormData(emp); setEditingId(emp.id); setIsModalOpen(true); }} className="text-muted hover:text-indigo-500 p-1">
                  <Edit2 size={14} />
                </button>
                <button
                    onClick={() => {
                      showDialog({
                        title: "Delete Employee",
                        message: "Delete employee?",
                        type: "confirm",
                        onConfirm: () => saveToStorage(employees.filter(e => e.id !== emp.id), emp.id)
                      });
                    }}
                    className="p-1 text-muted hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition"
                >
                    <Trash2 size={14} />
                </button>
              </div>
              
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                <User size={24} />
              </div>
              <h3 className="font-black text-themed text-lg cursor-pointer hover:text-indigo-500 transition" onClick={() => setSelectedEmployee(emp)}>
                {emp.name}
              </h3>
              <p className="text-muted text-xs font-bold mb-3">{emp.role}</p>
              
              <div className="mt-auto space-y-2 pt-4 border-t border-[var(--border-color)]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Status</span>
                  <span className={`font-black ${emp.status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}`}>{emp.status}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Salary</span>
                  <span className="font-black text-themed">₹{emp.salary} <span className="text-[9px] text-muted uppercase">({emp.salaryType.slice(0,2)})</span></span>
                </div>
              </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && (
             <div className="col-span-full py-16 text-center text-muted font-bold text-sm">No employees match your search.</div>
          )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="themed-modal p-8 rounded-[32px] w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-6 right-6 text-muted hover:text-themed transition bg-[var(--bg-card)] p-2 rounded-full"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black mb-8 text-themed">
              {editingId ? "Update Employee Details" : "Register New Staff"}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Personal Information</h3>
                <input
                  required
                  placeholder="Full Name"
                  className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                  required
                  placeholder="Phone Number"
                  className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <input
                  placeholder="Email Address (Optional)"
                  className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  required
                  placeholder="Home Address"
                  className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              
              {/* Job & Payroll */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Job & Payroll</h3>
                <input
                  required
                  placeholder="Job Role (e.g. Carpenter, Supervisor)"
                  className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <select
                      className="w-full p-3 border-2 rounded-xl themed-input outline-none focus:border-indigo-500 text-sm font-bold appearance-none"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                  </div>
                  <div className="relative">
                    <select
                      className="w-full p-3 border-2 rounded-xl themed-input outline-none focus:border-indigo-500 text-sm font-bold appearance-none"
                      value={formData.salaryType}
                      onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Daily">Daily</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                  <input
                    required
                    type="number"
                    placeholder="Base Salary Amount"
                    className="w-full pl-8 p-3 border-2 themed-input rounded-xl transition outline-none border-[var(--border-color)] focus:border-indigo-500 text-sm font-bold"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Additional Docs */}
              <div className="md:col-span-2 space-y-4 mt-2">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Verification & Banking</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input
                     placeholder="Govt ID (e.g. Aadhar / PAN)"
                     className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                     value={formData.govId}
                     onChange={(e) => setFormData({ ...formData, govId: e.target.value })}
                   />
                   <input
                     placeholder="Bank Details (Bank Name, Acc No, IFSC)"
                     className="w-full p-3 border-2 rounded-xl themed-input transition outline-none focus:border-indigo-500 text-sm font-bold"
                     value={formData.bankDetails}
                     onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                   />
                 </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-base mt-8 hover:bg-indigo-700 shadow-md transition"
            >
              {editingId ? "Save Changes" : "Create Profile"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
