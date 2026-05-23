import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Landmark,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Filter,
  FileText,
  Wallet,
  Receipt,
  IndianRupee,
} from "lucide-react";

const CATEGORY_COLORS = {
  "Project Income": { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: TrendingUp },
  "Employee Payroll": { bg: "bg-violet-500/10", text: "text-violet-400", icon: Wallet },
  "Material Purchase": { bg: "bg-amber-500/10", text: "text-amber-400", icon: Receipt },
  "Overhead": { bg: "bg-orange-500/10", text: "text-orange-400", icon: Receipt },
  "Other": { bg: "bg-slate-500/10", text: "text-slate-400", icon: FileText },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];
}

// We fetch transactions directly from the backend ledger now

export default function AccountsPage() {
    const [transactions, setTransactions] = useState([]);
    const [viewType, setViewType] = useState("Monthly");
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const loadLedger = async () => {
      try {
        const res = await fetch('/api/finance/accounts');
        const data = await res.json();
        // Backend returns: id, date, description, type, category, amount
        // Normalize date and amount
        const txns = data.map(d => {
          let dateStr = new Date().toISOString().split('T')[0];
          if (d.date) {
            const parsed = new Date(d.date);
            if (!isNaN(parsed)) dateStr = parsed.toISOString().split('T')[0];
          }
          return {
            ...d,
            amount: parseFloat(d.amount) || 0,
            date: dateStr
          };
        });
        setTransactions(txns);
      } catch (err) { console.error(err); }
    };
    loadLedger();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time filter
  const timeFiltered = transactions.filter((item) => {
    const itemDate = new Date(item.date);
    const today = new Date();
    if (viewType === "Monthly") {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return itemDate >= new Date(fiscalYearStart, 3, 1);
  });

  // Apply all filters
  const finalFiltered = timeFiltered.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    const matchCat = categoryFilter === "All" || t.category === categoryFilter;
    const matchType = typeFilter === "All" || t.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  const totalCredit = timeFiltered.filter((t) => t.type === "Credit").reduce((s, t) => s + t.amount, 0);
  const totalDebit = timeFiltered.filter((t) => t.type === "Debit").reduce((s, t) => s + t.amount, 0);
  const balance = totalCredit - totalDebit;

  // Running balance (chronological order for calculation)
  const sorted = [...finalFiltered].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const withBalance = sorted.map((t) => {
    running += t.type === "Credit" ? t.amount : -t.amount;
    return { ...t, runningBalance: running };
  }).reverse();

  const uniqueCategories = ["All", ...Array.from(new Set(transactions.map((t) => t.category)))];

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("MONA INTERIOR — ACCOUNT STATEMENT", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${viewType} | Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);
    autoTable(doc, {
      head: [["Date", "Description", "Category", "Debit (₹)", "Credit (₹)", "Balance (₹)"]],
      body: withBalance.map((t) => [
        new Date(t.date).toLocaleDateString("en-IN"),
        t.description,
        t.category,
        t.type === "Debit" ? t.amount.toLocaleString() : "",
        t.type === "Credit" ? t.amount.toLocaleString() : "",
        t.runningBalance.toLocaleString(),
      ]),
      startY: 32,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
    doc.save(`Statement_${viewType}_${Date.now()}.pdf`);
  };

  // Excel Export
  const exportToExcel = () => {
    const rows = withBalance.map((t) => ({
      Date: new Date(t.date).toLocaleDateString("en-IN"),
      Description: t.description,
      Category: t.category,
      Type: t.type,
      Debit: t.type === "Debit" ? t.amount : "",
      Credit: t.type === "Credit" ? t.amount : "",
      "Running Balance": t.runningBalance,
    }));

    // Summary rows
    rows.push({});
    rows.push({ Description: "TOTAL CREDITS", Credit: totalCredit });
    rows.push({ Description: "TOTAL DEBITS", Debit: totalDebit });
    rows.push({ Description: "CLOSING BALANCE", "Running Balance": balance });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Mona_Statement_${viewType}_${Date.now()}.xlsx`);
  };

  const TYPE_TABS = ["All", "Credit", "Debit"];

  return (
    <div className="p-4 md:p-6 page-wrapper">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <Landmark className="text-indigo-500" size={18} />
            Account Statement
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">
            Read-only balance sheet — auto-synced from all modules.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-xs">
          <Clock size={13} />
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="themed-card border-l-4 border-l-indigo-500 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
          <p className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">
            {viewType} Net Balance
          </p>
          <h2 className={`text-2xl font-black tracking-tighter ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </h2>
          <p className="text-muted text-[10px] mt-1 font-medium">
            {balance >= 0 ? "Surplus" : "Deficit"}
          </p>
        </div>

        <div className="themed-card backdrop-blur-xl shadow-xl p-5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">
              Total Inflow
            </p>
            <h2 className="text-xl font-black text-emerald-500">
              ₹{totalCredit.toLocaleString()}
            </h2>
            <p className="text-[10px] text-muted mt-1">Credits (Income)</p>
          </div>
          <div className="p-3 bg-[var(--accent-soft)] rounded-2xl text-indigo-500 border border-[var(--border-color)]">
            <ArrowUpCircle size={20} />
          </div>
        </div>

        <div className="themed-card backdrop-blur-xl shadow-xl p-5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">
              Total Outflow
            </p>
            <h2 className="text-xl font-black text-red-500">
              ₹{totalDebit.toLocaleString()}
            </h2>
            <p className="text-[10px] text-muted mt-1">Debits (Expenses)</p>
          </div>
          <div className="p-3 bg-[var(--accent-soft)] rounded-2xl text-indigo-500 border border-[var(--border-color)]">
            <ArrowDownCircle size={20} />
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 themed-thead">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period Toggle */}
            <div className="flex themed-card p-1 rounded-xl">
              {["Monthly", "Financial Year"].map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    viewType === type
                      ? "bg-indigo-600 text-white shadow"
                      : "text-muted hover:text-themed"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex gap-1 themed-card p-1 rounded-xl">
              {TYPE_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    typeFilter === t
                      ? t === "Credit"
                        ? "bg-emerald-600 text-white shadow"
                        : t === "Debit"
                        ? "bg-red-500 text-white shadow"
                        : "bg-indigo-600 text-white shadow"
                      : "text-muted hover:text-themed"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              className="px-4 py-2 themed-input rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {uniqueCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                className="pl-9 pr-4 py-2.5 themed-input border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-56"
                placeholder="Search statement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Export PDF */}
            <button
              onClick={exportToPDF}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
            >
              <Download size={15} /> PDF
            </button>
            {/* Export Excel */}
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm"
            >
              <FileSpreadsheet size={15} /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)] themed-thead">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Description</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5 text-right">Debit</th>
                <th className="px-8 py-5 text-right">Credit</th>
                <th className="px-8 py-5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y themed-divider">
              {withBalance.map((txn) => {
                const { bg, text, icon: CatIcon } = getCategoryStyle(txn.category);
                return (
                  <tr key={txn.id} className="themed-row group">
                    <td className="px-8 py-5 text-sm text-muted font-medium whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-8 py-5 max-w-xs">
                      <p className="font-bold text-themed text-sm leading-tight">
                        {txn.description}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${bg} ${text}`}>
                        <CatIcon size={10} />
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-red-500">
                      {txn.type === "Debit" ? `₹${txn.amount.toLocaleString()}` : ""}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-emerald-500">
                      {txn.type === "Credit" ? `₹${txn.amount.toLocaleString()}` : ""}
                    </td>
                    <td className={`px-8 py-5 text-right font-black text-base ${
                      txn.runningBalance >= 0 ? "text-themed" : "text-red-400"
                    }`}>
                      ₹{txn.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer */}
            {withBalance.length > 0 && (
              <tfoot className="border-t-4 border-[var(--border-color)]">
                <tr className="bg-[var(--bg-surface)]">
                  <td colSpan={3} className="px-8 py-6 text-right font-black text-muted uppercase tracking-widest text-[10px]">
                    Period Total
                  </td>
                  <td className="px-8 py-6 text-right font-black text-red-500 text-lg italic border-r border-[var(--border-color)]">
                    −₹{totalDebit.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-emerald-500 text-lg italic">
                    +₹{totalCredit.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-muted text-sm">
                    —
                  </td>
                </tr>
                <tr className="bg-[var(--accent-soft)]">
                  <td colSpan={4} className="px-8 py-8 text-right font-black uppercase tracking-widest text-xs text-muted">
                    {viewType} Closing Balance
                  </td>
                  <td colSpan={2} className="px-8 py-8 text-right">
                    <span className={`text-3xl font-black tracking-tighter ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ₹{Math.abs(balance).toLocaleString()}
                    </span>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                      {balance >= 0 ? "Surplus" : "Deficit"}
                    </p>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {withBalance.length === 0 && (
          <div className="py-20 text-center">
            <Filter className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              No transactions found for the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
