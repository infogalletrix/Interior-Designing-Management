import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Pencil,
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";
import NotificationWidget from "../components/NotificationWidget";
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
  const navigate = useNavigate();
  const [uiMode, setUiMode] = useState("Dashboard");
  const [sites, setSites] = useState([]);
  
  // Bulk States
  const [bulkItems, setBulkItems] = useState([{ id: Date.now(), material: "", qty: "", cost: "" }]);
  const [bulkTransactionType, setBulkTransactionType] = useState("Expense");
  const [bulkExpenseType, setBulkExpenseType] = useState("Client");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkClient, setBulkClient] = useState("");
  const [bulkCategory, setBulkCategory] = useState(OVERHEAD_CATEGORIES[0]);

  const addBulkRow = () => {
    setBulkItems((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), material: "", qty: "", cost: "" },
    ]);
  };

  const handleBulkItemChange = (id, field, value) => {
    setBulkItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleKeyDown = (e, idx, field) => {
    const fields = ["material", "qty", "cost"];
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === bulkItems.length - 1) {
        addBulkRow();
        setTimeout(() => {
          const nextInput = document.getElementById(`bulk-input-${idx + 1}-material`);
          if (nextInput) nextInput.focus();
        }, 50);
      } else {
        const nextInput = document.getElementById(`bulk-input-${idx + 1}-${field}`);
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`bulk-input-${idx + 1}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`bulk-input-${idx - 1}-${field}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === "ArrowRight") {
      if (e.target.selectionStart === e.target.value.length) {
        e.preventDefault();
        const fieldIdx = fields.indexOf(field);
        if (fieldIdx < fields.length - 1) {
          const nextInput = document.getElementById(`bulk-input-${idx}-${fields[fieldIdx + 1]}`);
          if (nextInput) nextInput.focus();
        }
      }
    } else if (e.key === "ArrowLeft") {
      if (e.target.selectionEnd === 0) {
        e.preventDefault();
        const fieldIdx = fields.indexOf(field);
        if (fieldIdx > 0) {
          const prevInput = document.getElementById(`bulk-input-${idx}-${fields[fieldIdx - 1]}`);
          if (prevInput) prevInput.focus();
        }
      }
    }
  };

  const removeBulkItem = (id) => {
    const idx = bulkItems.findIndex((i) => i.id === id);
    if (idx === 0) {
      setBulkItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, material: "", qty: "", cost: "" } : item
        )
      );
    } else {
      setBulkItems(bulkItems.filter((i) => i.id !== id));
    }
  };

  const [activeTab, setActiveTab] = useState("All");
  const [viewType, setViewType] = useState("Monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
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
    const validItems = bulkItems.filter(i => i.material || i.cost);
    if (validItems.length === 0) {
      showDialog({ title: "No Items", message: "No valid items to save.", type: "alert" });
      return;
    }
    
    const isCredit = bulkTransactionType === "Credit";
    const actualType = isCredit ? "Credit" : bulkExpenseType;
    if (actualType === "Client" && !bulkClient) {
      showDialog({ title: "Missing Work Order", message: "Please select a Work Order before saving.", type: "alert" });
      return;
    }

    try {
      for (const item of validItems) {
        const cost = parseFloat(item.cost || 0);
        if (cost === 0 && !item.material) continue;
        
        await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            date: bulkDate, 
            category: actualType === "Overhead" ? bulkCategory : actualType === "Credit" ? bulkCategory : "", 
            description: actualType === "Overhead" || actualType === "Credit" ? item.material : "", 
            amount: cost, 
            clientId: actualType === "Client" ? bulkClient.toString() : "", 
            type: actualType 
          })
        });
      }
      await loadExpenses();
      setBulkItems([{ id: Date.now(), material: "", qty: "", cost: "" }]);
      showDialog({ title: "Success", message: "Bulk expenses saved successfully!", type: "success" });
      if (location.state?.returnToSites) {
        navigate("/sites");
      }
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
      if (location.state?.restrictToSiteId) {
        setBulkClient(location.state.restrictToSiteId);
        setBulkExpenseType("Client");
      }
      setIsModalOpen(true);
    }
  }, [location.state]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const entry = {
      ...newExpense,
      cost: parseFloat(newExpense.cost),
    };
    try {
      const payload = { 
        date: entry.date, 
        category: entry.category || "", 
        description: entry.expenseType === "Client" ? entry.material : entry.description, 
        amount: entry.cost, 
        clientId: entry.client ? entry.client.toString() : "", 
        type: entry.expenseType 
      };

      if (editingExpenseId) {
        await fetch(`/api/finance/expenses/${editingExpenseId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
      }

      loadExpenses();
      showDialog({ title: editingExpenseId ? "Updated" : "Recorded", message: `Expense ${editingExpenseId ? "updated" : "recorded"} successfully`, type: "success" });
      if (location.state?.returnToSites) {
        navigate("/sites");
        return;
      }
      setIsModalOpen(false);
      setEditingExpenseId(null);
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

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setNewExpense({
      expenseType: expense.expenseType,
      client: expense.client || "",
      material: expense.expenseType === "Client" ? expense.material : "",
      qty: "", // Qty not stored in backend, reset
      cost: expense.cost.toString(),
      category: expense.category || OVERHEAD_CATEGORIES[0],
      description: expense.expenseType !== "Client" ? expense.description : "",
      date: expense.date ? expense.date.split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleDeleteExpense = (id) => {
    showDialog({
      title: "Delete Expense",
      message: "Are you sure you want to delete this log? This will update the Accounts ledger.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' });
          loadExpenses();
          showDialog({ title: "Deleted", message: "Expense deleted successfully.", type: "success" });
        } catch(err) { console.error(err); }
      }
    });
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
    if (activeTab === "All") return true;
    if (activeTab === "Client") return e.expenseType === "Client";
    if (activeTab === "Overhead") return e.expenseType === "Overhead";
    if (activeTab === "Credit") return e.expenseType === "Credit";
    return true;
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
        <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end relative z-50">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-muted uppercase">Transaction Type</label>
            <select
              value={bulkTransactionType}
              onChange={(e) => {
                setBulkTransactionType(e.target.value);
                if (e.target.value === "Credit") {
                  setBulkCategory("Bank Interest");
                } else if (bulkExpenseType === "Overhead") {
                  setBulkCategory(OVERHEAD_CATEGORIES[0]);
                }
              }}
              disabled={isClientOnlyView}
              className={`w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold ${isClientOnlyView ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="Expense">Expense</option>
              {!isClientOnlyView && <option value="Credit">Credit</option>}
            </select>
          </div>

          {bulkTransactionType === "Expense" ? (
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-muted uppercase">Expense Type</label>
              <select
                value={bulkExpenseType}
                onChange={(e) => {
                  setBulkExpenseType(e.target.value);
                  if (e.target.value === "Overhead") {
                    setBulkCategory(OVERHEAD_CATEGORIES[0]);
                  }
                }}
                disabled={isClientOnlyView || !!location.state?.restrictToSiteId}
                className={`w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold ${isClientOnlyView || !!location.state?.restrictToSiteId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="Client">Client</option>
                {!isClientOnlyView && <option value="Overhead">Overhead</option>}
              </select>
            </div>
          ) : (
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-muted uppercase">Credit Type</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold"
              >
                <option>Bank Interest</option>
                <option>Reversal</option>
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {bulkTransactionType === "Expense" && bulkExpenseType === "Client" && (
            <div className="col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Work Order *</label>
              <SearchableSelect
                value={bulkClient}
                onChange={(e) => setBulkClient(e.target.value)}
                options={sites.map(site => ({ value: site.id, label: `${site.name} (Client: ${site.clientName})` }))}
                placeholder="-- Select Work Order --"
                className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400 font-bold"
                disabled={!!location.state?.restrictToSiteId}
              />
            </div>
          )}

          {bulkTransactionType === "Expense" && bulkExpenseType === "Overhead" && (
            <div className="col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Overhead Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-indigo-400"
              >
                {OVERHEAD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className={`${bulkTransactionType === "Expense" ? "col-span-2" : "col-span-5"} flex flex-col items-end justify-end pb-0.5 pr-2`}>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Bulk Total</span>
            <span className="text-sm font-black text-indigo-300">
              ₹{bulkItems.reduce((s, i) => s + parseFloat(i.cost || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="col-span-1 flex justify-end items-center pb-1">
            <NotificationWidget />
          </div>
        </div>



        {/* ── TABLE ── */}
        <div className="flex-grow bg-[var(--bg-surface)] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="themed-thead border-b border-[var(--border-color)] sticky top-0">
              <tr className="uppercase text-muted font-bold">
                <th className="px-2 py-1 border-r border-gray-300 text-center w-12">Rem</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-10">S#</th>
                <th className="px-2 py-1 border-r border-gray-300 text-left">Details / Material</th>
                <th className="px-2 py-1 border-r border-gray-300 text-center w-24">Qty / Unit</th>
                <th className="px-2 py-1 text-right w-32">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bulkItems.map((item, idx) => (
                <tr key={item.id} className="themed-row">
                  <td className="px-2 py-1 border-r border-white/10 text-center">
                    <button
                      onClick={() => removeBulkItem(item.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title={idx === 0 ? "Clear Row" : "Remove Row"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                  <td className="px-2 py-1 border-r border-white/10 text-center font-bold text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-1 py-1 border-r border-white/10">
                    <input
                      id={`bulk-input-${idx}-material`}
                      type="text"
                      placeholder={bulkExpenseType === "Client" ? "e.g. Plywood" : "e.g. Office Rent"}
                      value={item.material || ""}
                      onChange={(e) => handleBulkItemChange(item.id, "material", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, "material")}
                      className="w-full bg-transparent border-none outline-none text-themed font-medium px-1 placeholder-slate-600"
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-white/10">
                    <input
                      id={`bulk-input-${idx}-qty`}
                      type="text"
                      placeholder="e.g. 10 Sheets"
                      value={item.qty || ""}
                      onChange={(e) => handleBulkItemChange(item.id, "qty", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, "qty")}
                      className="w-full bg-transparent border-none outline-none text-center text-themed px-1"
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-white/10">
                    <input
                      id={`bulk-input-${idx}-cost`}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={item.cost || ""}
                      onChange={(e) => handleBulkItemChange(item.id, "cost", e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
                      onKeyDown={(e) => handleKeyDown(e, idx, "cost")}
                      className="w-full bg-transparent border-none outline-none text-right text-themed px-1 font-bold"
                    />
                  </td>
                </tr>
              ))}
              {bulkItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-muted font-bold uppercase tracking-widest italic">
                    No items in bulk entry list
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-2 border-b border-[var(--border-color)] flex justify-center">
            <button 
              onClick={addBulkRow}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold text-xs hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
            >
              <Plus size={14} strokeWidth={3} /> Add Row
            </button>
          </div>
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
                onConfirm: () => setBulkItems([{ id: Date.now(), material: "", qty: "", cost: "" }])
              });
            }}
            className="bg-[#D4AF37] hover:bg-[#c4a133] text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <RotateCcw size={14} /> Clear List
          </button>
          <button
            onClick={saveBulkExpenses}
            className="btn-accent px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
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
      <div className="flex justify-between items-center mb-5 relative z-50">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <Receipt className="text-[var(--accent)]" size={18} />
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
                    ? "btn-accent shadow-md"
                    : "text-muted hover:text-themed"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUiMode("Bulk")}
            className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
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
            className="btn-accent h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Log Expense
          </button>
          <NotificationWidget />
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
            <h2 className="text-xl font-black text-[var(--accent)]">
              ₹{totalClientCost.toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Materials &amp; procurement {isClientOnlyView && `for ${location.state.autoFill?.name}`}
            </p>
          </div>
          <div className="p-3 bg-[var(--accent)]/10 rounded-2xl text-[var(--accent)] border border-[var(--accent)]/20">
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
                      ? "btn-accent shadow"
                      : tab === "Overhead"
                      ? "bg-amber-500 text-white shadow"
                      : "btn-accent shadow"
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
                <th className="px-8 py-4 text-center">Actions</th>
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
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
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
                      <span className="text-[var(--accent)] font-black text-xs uppercase tracking-wide">
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
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditExpense(expense)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 rounded-lg transition-colors"
                        title="Edit Expense"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
              <span className="text-[var(--accent)] text-base">
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
              onClick={() => {
                setIsModalOpen(false);
                setEditingExpenseId(null);
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
              }}
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
                        ? "btn-accent shadow-lg"
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
                        disabled={!!location.state?.restrictToSiteId}
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
                        type="text"
                        inputMode="decimal" pattern="^\d*\.?\d*$"
                        placeholder="0.00"
                        className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm transition"
                        value={newExpense.cost}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            cost: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'),
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
                        {newExpense.expenseType === "Credit" ? (
                          <>
                            <option>Bank Interest</option>
                            <option>Reversal</option>
                          </>
                        ) : (
                          OVERHEAD_CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))
                        )}
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
                      type="text"
                      inputMode="decimal" pattern="^\d*\.?\d*$"
                      placeholder="0.00"
                      className="w-full p-4 themed-input border border-[var(--border-color)] rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition"
                      value={newExpense.cost}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, cost: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1') })
                      }
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className={`w-full text-white py-5 rounded-[25px] font-black text-sm uppercase tracking-[0.2em] mt-4 shadow-xl transition-all active:scale-95 ${
                  newExpense.expenseType === "Client"
                    ? "btn-accent"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                Save {newExpense.expenseType} {newExpense.expenseType === "Credit" ? "Entry" : "Expense Entry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
