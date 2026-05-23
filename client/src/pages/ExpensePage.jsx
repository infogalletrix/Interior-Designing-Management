import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Receipt,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  User,
  Building2,
  Tag,
  Calendar,
  Layers,
  Filter,
  ListPlus,
  Save,
  RotateCcw,
  Trash2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";
import SearchableSelect from "../components/SearchableSelect";

const OVERHEAD_CATEGORIES = [
  "Office Rent",
  "Electricity",
  "Internet & Phone",
  "Vehicle & Fuel",
  "Office Supplies",
  "Maintenance",
  "Software & Tools",
  "Marketing",
  "Surge Charges",
  "Bank Charges",
  "Miscellaneous",
];

const INITIAL_EXPENSES = [];

export default function ExpensePage() {
  const { showDialog } = useDialog();
  const location = useLocation();
  const [uiMode, setUiMode] = useState("Dashboard");
  const [sites, setSites] = useState([]);
  
  // Bulk States
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkExpenseType, setBulkExpenseType] = useState("Client");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkClient, setBulkClient] = useState("");
  const [bulkCategory, setBulkCategory] = useState(OVERHEAD_CATEGORIES[0]);
  
  const [bulkNewItem, setBulkNewItem] = useState({
    material: "",
    qty: "",
    cost: ""
  });

  const addBulkItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bulkNewItem.cost || !bulkNewItem.material) {
      showDialog({ title: "Missing Information", message: "Please fill out description and cost.", type: "alert" });
      return;
    }
    if (bulkExpenseType === "Client" && !bulkClient) {
      showDialog({ title: "Missing Work Order", message: "Please select a Work Order before adding.", type: "alert" });
      return;
    }
    setBulkItems([...bulkItems, {
      ...bulkNewItem,
      id: Date.now(),
      expenseType: bulkExpenseType,
      date: bulkDate,
      client: bulkExpenseType === "Client" ? bulkClient : "",
      category: bulkExpenseType === "Overhead" ? bulkCategory : "",
      description: bulkExpenseType === "Overhead" ? bulkNewItem.material : "",
      material: bulkExpenseType === "Client" ? bulkNewItem.material : "",
      cost: parseFloat(bulkNewItem.cost || 0)
    }]);
    setBulkNewItem({ material: "", qty: "", cost: "" });
  };

  const removeBulkItem = (id) => setBulkItems(bulkItems.filter((i) => i.id !== id));

  const [activeTab, setActiveTab] = useState("All");
  const [viewType, setViewType] = useState("Monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseHistory, setExpenseHistory] = useState([]);

  const isClientOnlyView = location.state?.view === "ClientOnly";

  useEffect(() => {
    if (isClientOnlyView) {
      setActiveTab("Client");
    }
  }, [isClientOnlyView]);

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/finance/expenses');
      const data = await res.json();
      setExpenseHistory(data.map(e => ({ ...e, cost: e.amount, expenseType: e.type, client: e.clientId, material: e.description })));
    } catch(err) { console.error(err); }
  };

  React.useEffect(() => {
    loadExpenses();
    const fetchSites = async () => {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) setSites(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchSites();
  }, []);

  const saveBulkExpenses = async () => {
    if (bulkItems.length === 0) {
      showDialog({ title: "No Items", message: "No items to save.", type: "alert" });
      return;
    }
    
    // Some basic validation
    const invalidClient = bulkItems.find(i => i.expenseType === "Client" && !i.client);
    if (invalidClient) {
      showDialog({ title: "Missing Information", message: "Please make sure all client expenses have a Client Name specified before adding to the list.", type: "alert" });
      return;
    }

    try {
      for (const item of bulkItems) {
        await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ date: item.date, category: item.category, description: item.expenseType === "Client" ? item.material : item.description, amount: item.cost, clientId: item.client, type: item.expenseType })
        });
      }
      await loadExpenses();
      setBulkItems([]);
      showDialog({ title: "Success", message: "Bulk expenses saved successfully!", type: "success" });
    } catch(err) { console.error(err); }
  };

  const [newExpense, setNewExpense] = useState({
    expenseType: "Client",
    client: "",
    material: "",
    qty: "",
    cost: "",
    category: OVERHEAD_CATEGORIES[0],
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (location.state?.autoFill) {
      const { id, name } = location.state.autoFill;
      setNewExpense(prev => ({ ...prev, client: id ? id.toString() : name, expenseType: "Client" }));
      setIsModalOpen(true);
    }
  }, [location.state]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const entry = {
      ...newExpense,
      id: `EXP-${Date.now()}`,
      cost: parseFloat(newExpense.cost),
    };
    try {
      await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ date: entry.date, category: entry.category, description: entry.expenseType === "Client" ? entry.material : entry.description, amount: entry.cost, clientId: entry.client, type: entry.expenseType })
      });
      loadExpenses();
      setIsModalOpen(false);
      setNewExpense({
        expenseType: "Client",
        client: "",
        material: "",
        qty: "",
        cost: "",
        category: OVERHEAD_CATEGORIES[0],
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch(err) { console.error(err); }
  };

  const timeFiltered = expenseHistory.filter((item) => {
    const itemDate = new Date(item.date);
    const today = new Date();
    if (viewType === "Monthly") {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    const fiscalYearStart =
      today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return itemDate >= new Date(`${fiscalYearStart}-04-01`);
  });

  const tabFiltered = timeFiltered.filter((e) => {
    if (activeTab === "Client") return e.expenseType === "Client";
    if (activeTab === "Overhead") return e.expenseType === "Overhead";
    if (activeTab === "Credit") return e.expenseType === "Credit";
    return e.expenseType !== "Credit";
  });

  const searchFiltered = tabFiltered.filter((e) => {
    const q = searchTerm.toLowerCase();
    const siteName = sites.find(s => s.id.toString() === e.client?.toString())?.name || e.client;

    const matchesSearch = (
      siteName?.toLowerCase().includes(q) ||
      e.material?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );

    if (isClientOnlyView && location.state?.autoFill?.id) {
      return matchesSearch && e.client?.toString() === location.state.autoFill.id.toString();
    }

    return matchesSearch;
  });

  const totalClientCost = timeFiltered
    .filter((e) => e.expenseType === "Client")
    .reduce((s, e) => s + e.cost, 0);
  const totalOverheadCost = timeFiltered
    .filter((e) => e.expenseType === "Overhead")
    .reduce((s, e) => s + e.cost, 0);
  const grandTotal = totalClientCost + totalOverheadCost;

  const TABS = ["All", "Client", "Overhead", "Credit"];

  useEffect(() => {
    if (isClientOnlyView) {
      setBulkExpenseType("Client");
      if (location.state?.autoFill?.id) {
        setBulkClient(location.state.autoFill.id.toString());
      } else if (location.state?.autoFill?.name) {
        setBulkClient(location.state.autoFill.name);
      }
    }
  }, [isClientOnlyView, location.state]);

  if (uiMode === "Bulk") {
    return (
      <div className="page-wrapper min-h-screen font-sans flex flex-col">
        {/* ── TOP INFO BAR ── */}
        <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-muted uppercase">Expense Type</label>
            <select
              value={bulkExpenseType}
              onChange={(e) => setBulkExpenseType(e.target.value)}
              disabled={isClientOnlyView}
              className={`w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold ${isClientOnlyView ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option>Client</option>
              {!isClientOnlyView && <option>Overhead</option>}
              {!isClientOnlyView && <option>Credit</option>}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          {bulkExpenseType === "Client" ? (
            <div className="col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Work Order *</label>
              <SearchableSelect
                value={bulkClient}
                onChange={(e) => setBulkClient(e.target.value)}
                options={sites.map(site => ({ value: site.id, label: `${site.name} (Client: ${site.clientName})` }))}
                placeholder="-- Select a Work Order --"
                className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold"
              />
            </div>
          ) : (
            <div className="col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400"
              >
                {bulkExpenseType === "Credit" 
                  ? <option>Bank Interest</option>
                  : OVERHEAD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-4 flex flex-col items-end justify-end pb-0.5">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Bulk Total</span>
            <span className="text-sm font-black text-indigo-300">
              ₹{bulkItems.reduce((s, i) => s + i.cost, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── ENTRY ROW ── */}
        <div className="bg-[var(--bg-surface)] p-1 grid grid-cols-12 gap-1 border-b border-[var(--border-color)]">
          <div className="col-span-6">
            <label className="block text-[10px] font-bold text-indigo-400 text-center uppercase">
              {bulkExpenseType === "Client" ? "Material / Item" : "Description"}
            </label>
            <input
              placeholder={bulkExpenseType === "Client" ? "e.g. Plywood" : "e.g. Office Rent"}
              value={bulkNewItem.material}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, material: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-medium"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-indigo-400 text-center uppercase">Qty / Unit (Optional)</label>
            <input
              placeholder="e.g. 10 Sheets"
              value={bulkNewItem.qty}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, qty: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-center outline-none focus:border-indigo-400"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-indigo-400 text-center uppercase tracking-tighter">Total Cost (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={bulkNewItem.cost}
              onChange={(e) => setBulkNewItem({ ...bulkNewItem, cost: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && addBulkItem()}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-right outline-none focus:border-indigo-400 font-bold"
            />
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="flex-grow bg-[var(--bg-surface)] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="themed-thead border-b border-[var(--border-color)] sticky top-0">
              <tr className="uppercase text-muted font-bold">
                <th className="px-2 py-1 border-r border-gray-300 text-center w-12">Rem</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-10">S#</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-24">Type</th>
                <th className="px-2 py-1 border-r border-gray-300 text-left">Client/Category</th>
                <th className="px-2 py-1 border-r border-gray-300 text-left">Details</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-20">Qty</th>
                <th className="px-2 py-1 text-right w-28">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bulkItems.map((item, idx) => (
                <tr key={item.id} className="themed-row">
                  <td className="px-2 py-1 border-r border-white/10 text-center">
                    <button onClick={() => removeBulkItem(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </td>
                  <td className="px-2 py-1 border-r border-[var(--border-color)] text-center font-bold text-muted">{idx + 1}</td>
                  <td className="px-2 py-1 border-r border-[var(--border-color)] text-center font-semibold text-indigo-400">{item.expenseType}</td>
                  <td className="px-2 py-1 border-r border-white/10 uppercase font-medium">
                    {item.expenseType === "Client" ? (sites.find(s => s.id.toString() === item.client?.toString())?.name || item.client) : item.category}
                  </td>
                  <td className="px-2 py-1 border-r border-white/10">{item.material || item.description}</td>
                  <td className="px-2 py-1 border-r border-white/10 text-center text-slate-400">{item.qty || "—"}</td>
                  <td className="px-2 py-1 text-right font-black text-indigo-700">{item.cost.toFixed(2)}</td>
                </tr>
              ))}
              {bulkItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-muted font-bold uppercase tracking-widest italic">
                    No items in bulk entry list
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── ACTION BAR ── */}
        <div className="bg-[var(--bg-surface)] p-1 flex justify-center gap-1 border-t border-[var(--border-color)]">
          <button
            onClick={() => setUiMode("Dashboard")}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <button
            onClick={() => {
              showDialog({
                title: "Clear Form",
                message: "Clear bulk list?",
                type: "confirm",
                onConfirm: () => setBulkItems([])
              });
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <RotateCcw size={14} /> Clear List
          </button>
          <button
            onClick={saveBulkExpenses}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <Save size={14} /> Save All Expenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 page-wrapper min-h-screen relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <Receipt className="text-indigo-500" size={18} />
            {isClientOnlyView ? `Project Expenses: ${location.state.autoFill?.name}` : 'Expenses Management'}
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">
            {isClientOnlyView 
              ? `Tracking all material and service costs for this work order.` 
              : 'Track client material costs & business overhead separately.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex themed-card p-1 rounded-xl">
            {["Monthly", "Financial Year"].map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  viewType === type
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-muted hover:text-themed"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUiMode("Bulk")}
            className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <ListPlus size={18} /> Bulk Entry
          </button>
          <button
            onClick={() => {
              setNewExpense({ ...newExpense, expenseType: "Credit", category: "Bank Interest" });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <TrendingUp size={18} /> Input Credit
          </button>
          <button
            onClick={() => {
              setNewExpense({ ...newExpense, expenseType: "Client" });
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Log Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className={`themed-card p-5 rounded-2xl shadow-xl ${isClientOnlyView ? 'lg:col-span-1' : ''}`}>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
            Total {isClientOnlyView ? 'Project' : 'Expenses'}
          </p>
          <h2 className="text-2xl font-black tracking-tighter">
            ₹{(isClientOnlyView ? totalClientCost : grandTotal).toLocaleString()}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-slate-400 text-[10px] font-bold">
            <Layers size={12} />
            <span>{viewType} view</span>
          </div>
        </div>

        <div className="themed-card shadow-xl p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Client Expenses
            </p>
            <h2 className="text-xl font-black text-indigo-600">
              ₹{totalClientCost.toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Materials &amp; procurement {isClientOnlyView && `for ${location.state.autoFill?.name}`}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
            <User size={20} />
          </div>
        </div>

        {!isClientOnlyView && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">
                Overhead Expenses
              </p>
              <h2 className="text-xl font-black text-amber-600">
                ₹{totalOverheadCost.toLocaleString()}
              </h2>
              <p className="text-[10px] text-muted mt-1 font-medium">
                Rent, utilities &amp; ops
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
              <Building2 size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1 themed-card p-1 rounded-xl">
            {TABS.filter(t => !isClientOnlyView || t !== "Overhead").map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? tab === "Client"
                      ? "bg-indigo-600 text-white shadow"
                      : tab === "Overhead"
                      ? "bg-amber-500 text-white shadow"
                      : "bg-indigo-600 text-white shadow"
                    : "text-muted hover:text-themed"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search expenses..."
              className="pl-9 pr-4 py-2.5 themed-input border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 font-medium w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)] themed-thead">
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Details</th>
                <th className="px-8 py-4">Category / Client</th>
                <th className="px-8 py-4">Qty / Unit</th>
                <th className="px-8 py-4 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y themed-divider">
              {searchFiltered.map((expense) => (
                <tr
                  key={expense.id}
                  className="themed-row transition-colors group"
                >
                  <td className="px-8 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        expense.expenseType === "Client"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {expense.expenseType === "Client" ? (
                        <User size={10} />
                      ) : (
                        <Building2 size={10} />
                      )}
                      {expense.expenseType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {new Date(expense.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-themed text-sm">
                      {expense.expenseType === "Client"
                        ? expense.material
                        : expense.description}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    {expense.expenseType === "Client" ? (
                      <span className="text-indigo-400 font-black text-xs uppercase tracking-wide">
                        {sites.find(s => s.id.toString() === expense.client?.toString())?.name || expense.client}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                        <Tag size={10} />
                        {expense.category}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-bold uppercase">
                    {expense.qty || "—"}
                  </td>
                  <td className="px-8 py-5 text-right font-black text-themed text-base">
                    ₹{expense.cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {searchFiltered.length === 0 && (
          <div className="py-20 text-center">
            <Filter className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              No expenses found for the selected filters.
            </p>
          </div>
        )}

        {/* Footer totals */}
        {searchFiltered.length > 0 && (
          <div className="border-t border-[var(--border-color)] px-8 py-4 bg-[var(--bg-surface)] flex justify-end">
            <div className="text-sm font-black text-themed">
              Showing {searchFiltered.length} entries &nbsp;|&nbsp; Total:{" "}
              <span className="text-indigo-400 text-base">
                ₹
                {searchFiltered
                  .reduce((s, e) => s + e.cost, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 dark:bg-slate-900/90">
          <form
            onSubmit={handleAddExpense}
            className="themed-modal p-10 rounded-[40px] w-full max-w-xl shadow-2xl relative border border-[var(--border-color)]"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 text-muted hover:text-themed transition"
            >
              <X size={28} />
            </button>

            <h2 className="text-3xl font-black mb-2 text-themed tracking-tighter">
              {newExpense.expenseType === "Credit" ? "Log Bank Credit" : "Log New Expense"}
            </h2>
            <p className="text-muted text-sm mb-8 font-medium">
              {newExpense.expenseType === "Credit" 
                ? "Enter bank interest or credit amounts." 
                : "Choose whether this is a client project cost or a business overhead."}
            </p>

            {/* Expense Type Toggle */}
            {newExpense.expenseType !== "Credit" && (
            <div className="flex gap-2 mb-8 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
              {["Client", "Overhead"].filter(t => !isClientOnlyView || t === "Client").map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setNewExpense({ ...newExpense, expenseType: type })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                    newExpense.expenseType === type
                      ? type === "Client"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-amber-500 text-white shadow-lg"
                      : "text-muted hover:text-themed"
                  }`}
                >
                  {type === "Client" ? (
                    <User size={16} />
                  ) : (
                    <Building2 size={16} />
                  )}
                  {type} Expense
                </button>
              ))}
            </div>
            )}

            <div className="space-y-4">
              {newExpense.expenseType === "Client" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Select Work Order *
                      </label>
                      <SearchableSelect
                        value={newExpense.client}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            client: e.target.value,
                          })
                        }
                        options={sites.map(site => ({ value: site.id, label: `${site.name} (Client: ${site.clientName})` }))}
                        placeholder="-- Select a Work Order --"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Date
                      </label>
                      <input
                        required
                        type="date"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.date}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Material / Item
                    </label>
                    <input
                      required
                      placeholder="e.g. Marine Plywood, Paint..."
                      className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                      value={newExpense.material}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          material: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Quantity
                      </label>
                      <input
                        placeholder="e.g. 10 units"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.qty}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, qty: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Total Cost (₹)
                      </label>
                      <input
                        required
                        type="number"
                        placeholder="0.00"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.cost}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            cost: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Category
                      </label>
                      <select
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition"
                        value={newExpense.category}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            category: e.target.value,
                          })
                        }
                      >
                        {newExpense.expenseType === "Credit" 
                          ? <option>Bank Interest</option>
                          : OVERHEAD_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                        Date
                      </label>
                      <input
                        required
                        type="date"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition"
                        value={newExpense.date}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Description
                    </label>
                    <input
                      required
                      placeholder="e.g. April office rent payment"
                      className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-widest">
                      Amount (₹)
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition"
                      value={newExpense.cost}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, cost: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className={`w-full text-white py-5 rounded-[25px] font-black text-sm uppercase tracking-[0.2em] mt-4 shadow-xl transition-all active:scale-95 ${
                  newExpense.expenseType === "Client"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                Save {newExpense.expenseType} Expense Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
