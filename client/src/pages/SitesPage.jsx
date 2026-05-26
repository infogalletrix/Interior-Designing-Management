import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPin,
  Plus,
  Search,
  Building,
  Building2,
  CheckCircle2,
  Clock,
  Wrench,
  Camera,
  History,
  AlertTriangle,
  X,
  PlaySquare,
  Users,
  Image as ImageIcon,
  FileText,
  Receipt,
  IndianRupee,
  Edit,
  Briefcase,
  User,
  Calendar,
  Upload,
  ArrowRight,
  TrendingUp,
  Trash2,
  Printer
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";
import { useReactToPrint } from "react-to-print";
import FinalSettlementSheet from "../components/FinalSettlementSheet";

export default function SitesPage() {
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const settlementRef = useRef();
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("media"); // media, history, maintenance, financials
  const [searchTerm, setSearchTerm] = useState("");

  const handlePrintSettlement = useReactToPrint({
    contentRef: settlementRef,
    documentTitle: 'Final_Settlement_Sheet',
  });

  // Modals
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form State for Editing
  const [editFormData, setEditFormData] = useState(null);
  const [isNegotiatedAdd, setIsNegotiatedAdd] = useState(false);

  // Load data
  const loadSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();

      // Clean mapping: use backend names as primary state properties
      const mapped = data.map(s => ({
        ...s,
        // Ensure legacy field usage in other parts of the app doesn't break
        location: s.address,
        client: s.clientName,
        team: s.assignedTeam,
        history: Array.isArray(s.workHistory) ? s.workHistory : [],
        media: s.media || [],
        maintenance: s.maintenance || { required: false, frequency: "", lastDone: "", nextDue: "" }
      }));

      setSites(mapped);
    } catch (err) { console.error("Load Sites Error:", err); }
  };

  const loadClients = async () => {
    try {
      const res = await fetch('/api/crm');
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (err) { console.error("Load Clients Error:", err); }
  };

  const loadQuotations = async () => {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) setQuotations(await res.json());
    } catch (err) { console.error("Load Quotations Error:", err); }
  };

  const loadFinancials = async () => {
    try {
      const [invRes, recRes, expRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/finance/receipts'),
        fetch('/api/finance/expenses'),
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (recRes.ok) setReceipts(await recRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
    } catch (err) { console.error("Load Financials Error:", err); }
  };

  // Returns { billed, paid, balance, spent } for a given siteId
  const getSiteFinancials = (siteId) => {
    const id = String(siteId);
    const site = sites.find(s => String(s.id) === id);
    const budget = site ? Number(site.budget) || 0 : 0;

    const billed = invoices
      .filter(inv => String(inv.items?.workOrderId) === id && inv.status !== "Draft")
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const paid = receipts
      .filter(rec => String(rec.siteId) === id)
      .reduce((sum, rec) => sum + (Number(rec.amountPaid || rec.amount) || 0), 0);
    const spent = expenses
      .filter(exp => String(exp.clientId) === id)
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      
    return { billed, paid, balance: budget - paid, spent };
  };

  useEffect(() => {
    loadSites();
    loadClients();
    loadQuotations();
    loadFinancials();
    if (location.state?.convertQuote) {
      const q = location.state.convertQuote;
      setIsSiteModalOpen(true);
      setTimeout(() => {
        const form = document.getElementById("create-site-form");
        if (form) {
          if(q.projectTitle) form.elements.name.value = q.projectTitle;
          if(q.clientName) form.elements.clientName.value = q.clientName;
          if(q.organizationName) form.elements.organizationName.value = q.organizationName;
          if(q.clientAddress) form.elements.address.value = q.clientAddress;
          const budgetVal = q.totalAmount || q.total;
          if(budgetVal) form.elements.budget.value = budgetVal;
          if(q.workDescription) form.elements.description.value = q.workDescription;
        }
      }, 100);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleClientNameChange = (e) => {
    const val = e.target.value;
    const matched = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      const form = e.target.closest('form');
      if (form) {
        if (form.elements.organizationName && !form.elements.organizationName.value && matched.organizationName) {
          form.elements.organizationName.value = matched.organizationName;
        }
        if (form.elements.address && !form.elements.address.value && matched.address) {
          form.elements.address.value = matched.address;
        }
      }
    }
  };

  const handleQuotationSelect = (e) => {
    const qId = e.target.value;
    const q = quotations.find(qt => qt.id.toString() === qId);
    if (q) {
      const form = document.getElementById("create-site-form");
      if (form) {
        if(q.projectTitle) form.elements.name.value = q.projectTitle;
        if(q.clientName) form.elements.clientName.value = q.clientName;
        if(q.organizationName) form.elements.organizationName.value = q.organizationName;
        if(q.clientAddress) form.elements.address.value = q.clientAddress;
        const budgetVal = q.totalAmount || q.total;
        if(budgetVal) form.elements.budget.value = budgetVal;
        if(q.workDescription) form.elements.description.value = q.workDescription;
      }
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;

  const filteredSites = sites.filter((s) => {
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.address && s.address.toLowerCase().includes(term)) ||
      (s.clientName && s.clientName.toLowerCase().includes(term)) ||
      (s.assignedTeam && s.assignedTeam.toLowerCase().includes(term));
    return matchStatus && matchSearch;
  });

  // STATUS COLORS
  const getStatusColor = (status) => {
    if (status === "Completed") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (status === "Currently working" || status === "In Progress") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "Pre-Construction" || status === "Yet to work") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    if (status === "Maintenance") return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    return "bg-slate-700/30 text-slate-300 border-slate-600/30";
  };

  const updateSiteProperty = async (siteId, key, value) => {
    const s = sites.find(s => s.id === siteId);
    if (!s) return;

    // Construct full payload using camelCase (ASP.NET Core default)
    const payload = {
      name: key === "name" ? value : s.name,
      address: key === "address" ? value : s.address,
      clientName: key === "clientName" ? value : s.clientName,
      assignedTeam: key === "assignedTeam" ? value : s.assignedTeam,
      status: key === "status" ? value : s.status,
      workHistory: key === "workHistory" ? value : s.workHistory,
      startDate: key === "startDate" ? value : s.startDate,
      budget: key === "budget" ? parseFloat(value) : s.budget,
      description: key === "description" ? value : s.description,
      isArchived: s.isArchived,
      maintenance: key === "maintenance" ? value : s.maintenance
    };

    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) await loadSites();
    } catch (e) { console.error("Update Property Error:", e); }
  };

  const deleteSite = (id) => {
    showDialog({
      title: "Delete Work Order",
      message: "Are you sure you want to permanently delete this work order? All associated media, financials, and history will be lost.",
      type: "confirm",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedSiteId(null);
            await loadSites();
            showDialog({ title: "Deleted", message: "Work order removed successfully", type: "success" });
          } else {
            showDialog({ title: "Error", message: "Failed to delete work order", type: "error" });
          }
        } catch (e) {
          console.error("Delete Error:", e);
          showDialog({ title: "Error", message: "Failed to connect to server", type: "error" });
        }
      }
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const payload = {
      name: fd.get("name"),
      clientName: fd.get("clientName"),
      organizationName: fd.get("organizationName"),
      address: fd.get("address"),
      status: fd.get("status"),
      startDate: fd.get("startDate"),
      budget: parseFloat(fd.get("budget") || 0),
      description: fd.get("description"),
      isNegotiated: fd.get("isNegotiated") === "on",
      negotiationDetails: fd.get("negotiationDetails") || "",
      isArchived: selectedSite.isArchived,
      workHistory: selectedSite.workHistory, // Preserving original history
      maintenance: selectedSite.maintenance // Preserving maintenance
    };

    try {
      const res = await fetch(`/api/sites/${selectedSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await loadSites();
        setIsEditModalOpen(false);
      } else {
        const errorText = await res.text();
        showDialog({ title: "Error", message: "Failed to update project details: " + errorText, type: "error" });
      }
    } catch (e) {
      console.error("Edit Submit Error:", e);
      showDialog({ title: "Error", message: "Error connecting to server.", type: "error" });
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const isNeg = fd.get("isNegotiated") === "on";
    const budget = isNeg && fd.get("negotiatedBudget") ? parseFloat(fd.get("negotiatedBudget")) : parseFloat(fd.get("budget") || 0);

    // Using camelCase and ensuring NO null values for required DB columns
    const newSitePayload = {
      name: fd.get("name") || "",
      address: fd.get("address") || "",
      clientName: fd.get("clientName") || "",
      organizationName: fd.get("organizationName") || "",
      status: fd.get("status") || "Pre-Construction",
      startDate: fd.get("startDate") || new Date().toISOString().split("T")[0],
      budget: budget,
      description: fd.get("description") || "",
      isNegotiated: isNeg,
      negotiationDetails: fd.get("negotiationDetails") || "",
      isArchived: false,
      workHistory: [] 
    };

    try {
      console.log("Creating Work Order. Payload:", newSitePayload);
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSitePayload)
      });

      if (res.ok) {
        const createdData = await res.json();
        await loadSites();
        setIsSiteModalOpen(false);
        if (createdData.id) setSelectedSiteId(createdData.id);
        showDialog({ title: "Success", message: "Work order created successfully!", type: "success" });
      } else {
        const errorBody = await res.text();
        console.error("Server 500 Error Body:", errorBody);
        showDialog({ title: "Server Error", message: `Server Error (${res.status}). Ensure all fields are filled. Check console for details.`, type: "error" });
      }
    } catch (e) {
      console.error("Fetch Connection Error:", e);
      showDialog({ title: "Connection Error", message: "Failed to connect to backend server. Ensure it is running on port 5000.", type: "error" });
    }
  };


  const handleAddMedia = async (e) => {
    e.preventDefault();
    showDialog({ title: "Info", message: "Media added (Mock).", type: "info" });
    setIsMediaModalOpen(false);
  };

  const handleAddHistory = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newHistory = {
      id: `h-${Date.now()}`,
      date: fd.get("date"),
      desc: fd.get("desc"),
    };
    const s = sites.find(s => s.id === selectedSiteId);
    if (!s) return;
    const updatedHistory = [newHistory, ...s.history];
    await updateSiteProperty(selectedSiteId, "workHistory", updatedHistory);
    setIsHistoryModalOpen(false);
  };

  const handleGoToBilling = () => {
    navigate("/billing", {
      state: {
        autoFill: {
          clientName: selectedSite.clientName,
          projectTitle: selectedSite.name,
          address: selectedSite.address,
          organizationName: selectedSite.organizationName,
          workOrderId: selectedSite.id,
          desc: ""
        }
      }
    });
  };

  const handleGoToReceipt = () => {
    navigate("/receipts", {
      state: {
        autoFill: {
          name: selectedSite.clientName,
          organizationName: selectedSite.organizationName,
          desc: selectedSite.name,
          siteId: selectedSite.id,
          totalAmount: selectedSite.budget
        }
      }
    });
  };

  const handleGoToExpenses = () => {
    navigate("/expenses", {
      state: {
        view: "ClientOnly",
        autoFill: {
          id: selectedSite.id,
          name: selectedSite.name
        }
      }
    });
  };

  return (
    <div className="page-wrapper min-h-screen font-sans">
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-xl font-black text-themed flex items-center gap-2">
              <Building className="text-[#C9A227]" size={18} />
              Work Orders
            </h1>
            <p className="text-muted mt-0.5 text-xs font-medium">
              Manage site operations, financial links, and project progress.
            </p>
          </div>
          <button
            onClick={() => setIsSiteModalOpen(true)}
            className="bg-[#C9A227] hover:bg-[#B8911F] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition text-sm"
          >
            <Plus size={16} /> Create New Work Order
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* ── LEFT PANEL: SITES ROSTER ── */}
          <div className="xl:col-span-4 flex flex-col h-[calc(100vh-160px)]">
            {/* Filters */}
            <div className="themed-card rounded-t-3xl p-4 shadow-sm z-10 relative">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search site, client, team or location..."
                  className="w-full pl-9 pr-4 py-2.5 themed-input rounded-xl text-sm outline-none focus:border-indigo-500 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {["All", "Pre-Construction", "In Progress", "Completed", "Maintenance"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition ${statusFilter === status
                        ? "bg-[#C9A227]/10 text-[#C9A227]"
                        : "bg-white/5 text-muted hover:bg-white/10"
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="themed-card rounded-b-3xl border-t-0 shadow-sm flex-1 overflow-y-auto">
              {filteredSites.length === 0 ? (
                <p className="p-8 text-center text-muted font-bold text-sm">No work orders found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSiteId(site.id)}
                      className={`w-full text-left p-3 transition-all ${selectedSiteId === site.id ? "bg-[#C9A227]/10" : "hover:bg-white/5"}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-themed text-sm">{String(site.id).padStart(4, "0")} - {site.name}</h3>
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-black tracking-wider ${getStatusColor(
                            site.status
                          )}`}
                        >
                          {site.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <MapPin size={10} /> {site.address}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                          <User size={9} /> {site.clientName || "No Client"}
                        </div>
                        {site.isNegotiated && (
                          <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold uppercase">
                            Negotiated
                          </div>
                        )}
                      </div>
                      {/* Balance chip */}
                      {(() => {
                        const { billed, balance } = getSiteFinancials(site.id);
                        if (billed === 0) return null;
                        return (
                          <div className={`mt-2 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                            balance > 0
                              ? "bg-rose-500/10 border border-rose-500/20"
                              : "bg-emerald-500/10 border border-emerald-500/20"
                          }`}>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              balance > 0 ? "text-rose-400" : "text-emerald-400"
                            }`}>
                              {balance > 0 ? "Balance Due" : "Fully Paid"}
                            </span>
                            <span className={`text-[10px] font-black ${
                              balance > 0 ? "text-rose-400" : "text-emerald-400"
                            }`}>
                              ₹{Math.abs(balance).toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: SITE PROFILE ── */}
          <div className="xl:col-span-8 h-[calc(100vh-160px)]">
            {selectedSite ? (
              <div className="bg-white/5 border border-white/10 shadow-sm rounded-3xl h-full flex flex-col overflow-hidden relative">

                {/* Profile Header */}
                <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-surface)] relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-themed">{selectedSite.name}</h2>
                        <button
                          onClick={handlePrintSettlement}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-purple-500 text-xs font-bold transition-colors border border-purple-500/20"
                          title="Generate Final Settlement Sheet"
                        >
                          <Printer size={14} /> Final Settlement
                        </button>
                        <button
                          onClick={() => {
                            setEditFormData(selectedSite);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 bg-[var(--accent-soft)] hover:bg-[#C9A227]/20 rounded-lg text-[#C9A227] transition-colors"
                          title="Edit Project Details"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteSite(selectedSite.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors"
                          title="Delete Work Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium">
                          <MapPin size={14} /> {selectedSite.address}
                        </div>
                        <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium border-l border-[var(--border-color)] pl-4">
                          <User size={14} /> <span className="text-muted">Client:</span> {selectedSite.clientName || "N/A"}
                        </div>
                        {selectedSite.organizationName && (
                          <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium border-l border-[var(--border-color)] pl-4">
                            <Building2 size={14} /> <span className="text-muted">Org:</span> {selectedSite.organizationName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <select
                        value={selectedSite.status}
                        onChange={(e) => updateSiteProperty(selectedSite.id, "status", e.target.value)}
                        className={`font-black text-xs uppercase tracking-widest outline-none py-2 px-4 rounded-xl cursor-pointer ${getStatusColor(
                          selectedSite.status
                        )}`}
                      >
                        <option className="bg-[var(--modal-bg)]">Pre-Construction</option>
                        <option className="bg-[var(--modal-bg)]">In Progress</option>
                        <option className="bg-[var(--modal-bg)]">Completed</option>
                        <option className="bg-[var(--modal-bg)]">Maintenance</option>
                      </select>
                      <div className="text-[10px] font-black uppercase text-muted tracking-tighter">
                        Project ID: {String(selectedSite.id).padStart(4, "0")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-muted text-sm border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2">
                    </div>
                    <div className="flex items-center gap-4">
                      {(() => {
                        const { billed, paid, balance, spent } = getSiteFinancials(selectedSite.id);
                        return (
                          <>
                            <div className="flex flex-col items-start pr-4">
                              <span className="text-[10px] text-muted uppercase tracking-widest font-black">Invoiced</span>
                              <span className="text-blue-400 font-black text-sm tracking-tight">₹{billed.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col items-start border-l border-[var(--border-color)] pl-4 pr-4">
                              <span className="text-[10px] text-muted uppercase tracking-widest font-black">Receipts</span>
                              <span className="text-emerald-500 font-black text-sm tracking-tight">₹{paid.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col items-start border-l border-[var(--border-color)] pl-4 pr-4">
                              <span className="text-[10px] text-muted uppercase tracking-widest font-black">Balance Due</span>
                              <span className={`font-black text-sm tracking-tight ${balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                ₹{Math.abs(balance).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-col items-start border-l border-[var(--border-color)] pl-4 pr-4">
                              <span className="text-[10px] text-muted uppercase tracking-widest font-black">Spent</span>
                              <span className="text-amber-500 font-black text-sm tracking-tight">₹{spent.toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex flex-col items-start border-l border-[var(--border-color)] pl-4">
                        <span className="text-[10px] text-muted uppercase tracking-widest font-black">Budget</span>
                        <span className="text-emerald-400 font-black text-sm tracking-tight">₹{selectedSite.budget?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Closing Payment Warning Banner */}
                {(() => {
                  const { billed, paid } = getSiteFinancials(selectedSite.id);
                  const mismatch = billed - paid;
                  // Only show warning if there are invoices (billed > 0) and the receipts haven't covered them
                  if (billed > 0 && mismatch > 0) {
                    return (
                      <div className="bg-rose-500/10 border-b border-rose-500/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start md:items-center gap-3">
                          <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                          <div>
                            <h4 className="text-rose-500 font-bold text-sm">Pending Receipt Validation</h4>
                            <p className="text-rose-400/80 text-xs mt-0.5 font-medium">
                              Invoiced amount exceeds total receipts by <strong className="font-black text-rose-400">₹{mismatch.toLocaleString()}</strong>. Please complete the closing payment.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigate("/receipts", {
                              state: {
                                autoFill: {
                                  siteId: selectedSite.id,
                                  name: selectedSite.clientName,
                                  organizationName: selectedSite.organizationName,
                                  amountPaid: mismatch,
                                  category: "Final Settlement",
                                  desc: `Closing payment for Work Order #${selectedSite.id}`
                                }
                              }
                            });
                          }}
                          className="shrink-0 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Complete Payment
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Profile Tabs */}
                <div className="flex bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
                  {[
                    { id: "media", label: "Gallery", icon: <Camera size={14} /> },
                    { id: "history", label: "Timeline", icon: <History size={14} /> },
                    { id: "financials", label: "Finance", icon: <IndianRupee size={14} /> },
                    { id: "maintenance", label: "Maintenance", icon: <Wrench size={14} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${activeTab === tab.id
                          ? "bg-[var(--bg-card)] text-indigo-500 border-b-2 border-indigo-500"
                          : "text-muted hover:bg-white/5"
                        }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Profile Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-[var(--bg-surface)]">

                  {/* TAB: MEDIA GALLERY */}
                  {activeTab === "media" && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-themed uppercase tracking-tight">Photos & Videos</h3>
                        <button
                          onClick={() => setIsMediaModalOpen(true)}
                          className="bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/20 hover:bg-[#C9A227]/20 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
                        >
                          <Plus size={14} /> Add Media
                        </button>
                      </div>

                      {(selectedSite.media || []).length === 0 ? (
                        <div className="border-2 border-dashed border-[var(--border-color)] rounded-3xl p-12 text-center text-muted">
                          <ImageIcon className="mx-auto mb-3" size={40} />
                          <p className="font-bold text-sm">No media uploaded yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(selectedSite.media || []).map((m) => (
                            <div key={m.id} className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video flex items-center justify-center">
                              {m.type === "image" ? (
                                <img src={m.url} alt={m.category} className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90" />
                              ) : (
                                <>
                                  <video src={m.url} className="w-full h-full object-cover opacity-60" />
                                  <PlaySquare size={48} className="absolute text-white/80" />
                                </>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <span className="text-white font-bold text-sm">{m.category}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: WORK TIMELINE */}
                  {activeTab === "history" && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-themed uppercase tracking-tight">Activity Log</h3>
                        <button
                          onClick={() => setIsHistoryModalOpen(true)}
                          className="bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/20 hover:bg-[#C9A227]/20 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
                        >
                          <Plus size={14} /> Log Update
                        </button>
                      </div>

                      {(selectedSite.history || []).length === 0 ? (
                        <div className="border-2 border-dashed border-[var(--border-color)] rounded-3xl p-12 text-center text-muted">
                          <Clock className="mx-auto mb-3" size={40} />
                          <p className="font-bold text-sm">No timeline entries yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:to-transparent">
                          {(selectedSite.history || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry, idx) => (
                            <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#C9A227] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <CheckCircle2 size={16} />
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] themed-card p-4 rounded-xl shadow-sm">
                                <time className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1 block">
                                  {new Date(entry.date).toLocaleDateString('en-GB')}
                                </time>
                                <p className="text-themed text-sm font-medium">{entry.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: FINANCIALS */}
                  {activeTab === "financials" && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {/* Financial Summary - Compact */}
                      <div className="themed-card border-l-4 border-l-indigo-500 rounded-2xl p-4 flex justify-between items-center mb-4 shrink-0">
                        <div>
                          <h4 className="text-base font-black mb-0.5">Financial Summary</h4>
                          <p className="text-muted text-[10px] font-medium">Overview of the project budget.</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-400">₹{selectedSite.budget?.toLocaleString() || 0}</div>
                          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Allocated Budget</div>
                        </div>
                      </div>

                      {/* Actions List - Compact Horizontal Bars */}
                      <div className="flex flex-col gap-3">
                        {/* Billing Action */}
                        <div className="themed-card p-3 rounded-2xl flex items-center gap-4 hover:border-indigo-500/30 transition-all shadow-sm group">
                          <div className="w-10 h-10 bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/20 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-themed mb-0.5">Billing & Invoices</h4>
                            <p className="text-[10px] text-muted font-medium">Generate GST/Non-GST invoices for this client.</p>
                          </div>
                          <button onClick={handleGoToBilling} className="bg-[#C9A227] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-[#B8911F] transition shrink-0">
                            Create Invoice
                          </button>
                        </div>

                        <div className="themed-card p-3 rounded-2xl flex items-center gap-4 hover:border-emerald-500/30 transition-all shadow-sm group">
                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Receipt size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-themed mb-0.5">Payment Receipts</h4>
                            <p className="text-[10px] text-muted font-medium">Generate and track customer payment receipts.</p>
                          </div>
                          <button onClick={handleGoToReceipt} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-emerald-700 transition shrink-0">
                            Generate Receipt
                          </button>
                        </div>

                        <div className="themed-card p-3 rounded-2xl flex items-center gap-4 hover:border-amber-500/30 transition-all shadow-sm group">
                          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Briefcase size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-themed mb-0.5">Project Expenses</h4>
                            <p className="text-[10px] text-muted font-medium">Log material costs and labor for this specific site.</p>
                          </div>
                          <button onClick={handleGoToExpenses} className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-amber-700 transition shrink-0">
                            Log Expenses
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: MAINTENANCE CONFIG */}
                  {activeTab === "maintenance" && (
                    <div className="max-w-2xl mx-auto mt-0">
                      <div className="themed-card rounded-3xl p-5">
                        <div className="flex items-center gap-3 text-amber-400 mb-3">
                          <AlertTriangle size={20} />
                          <h3 className="text-base font-black tracking-tight text-themed">Periodic Maintenance Protocol</h3>
                        </div>

                        <div className="space-y-3" id="maintenance-form-container">
                          <label className="flex items-center gap-2 cursor-pointer mb-1">
                            <input
                              type="checkbox"
                              name="required"
                              defaultChecked={selectedSite.maintenance?.required}
                              className="w-4 h-4 accent-amber-600"
                            />
                            <span className="font-bold text-sm text-themed">Enable Periodic Maintenance Alerts</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Frequency</label>
                              <select
                                name="frequency"
                                defaultValue={selectedSite.maintenance?.frequency || ""}
                                className="w-full p-2 themed-input rounded-lg outline-none focus:border-amber-500 text-sm"
                              >
                                <option value="">Select...</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Bi-Annually">Bi-Annually</option>
                                <option value="Yearly">Yearly</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Last Serviced</label>
                              <input
                                type="date"
                                name="lastDone"
                                defaultValue={selectedSite.maintenance?.lastDone}
                                className="w-full p-2 themed-input rounded-lg outline-none focus:border-amber-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Next Due Date</label>
                              <input
                                type="date"
                                name="nextDue"
                                defaultValue={selectedSite.maintenance?.nextDue}
                                className="w-full p-2 themed-input rounded-lg outline-none focus:border-amber-500 font-bold text-amber-400 text-sm"
                              />
                            </div>
                          </div>

                          <div className="pt-3 mt-1 border-t border-amber-200/50">
                            <button 
                              type="button" 
                              onClick={() => {
                                const container = document.getElementById("maintenance-form-container");
                                const required = container.querySelector('[name="required"]').checked;
                                const frequency = container.querySelector('[name="frequency"]').value;
                                const lastDone = container.querySelector('[name="lastDone"]').value;
                                const nextDue = container.querySelector('[name="nextDue"]').value;
                                updateSiteProperty(selectedSite.id, "maintenance", { required, frequency, lastDone, nextDue });
                                showDialog({ title: "Maintenance", message: "Maintenance updated successfully.", type: "success" });
                              }} 
                              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-xs"
                            >
                              Save Maintenance Setup
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 shadow-sm rounded-3xl h-full flex items-center justify-center text-muted">
                <div className="text-center">
                  <Building size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Select a work order to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Printable Final Settlement Sheet */}
      {selectedSite && (
        <FinalSettlementSheet 
          ref={settlementRef} 
          site={selectedSite} 
          receipts={receipts.filter(r => String(r.siteId) === String(selectedSite.id))} 
        />
      )}

      {/* ── MODALS ── */}

      <datalist id="crm-clients-list">
        {clients.map(c => (
          <option key={c.id} value={c.name}>{c.organizationName ? `${c.organizationName}` : ""}</option>
        ))}
      </datalist>

      {/* Site Create Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form id="create-site-form" onSubmit={handleCreateSite} className="themed-modal rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#C9A227] p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black">Create Work Order</h2>
              <button type="button" onClick={() => setIsSiteModalOpen(false)} className="hover:text-slate-300"><X /></button>
            </div>
            <div className="p-4 space-y-2">
              {/* Load From Quote */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Load From Quotation</label>
                <select onChange={handleQuotationSelect} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm">
                  <option value="">Select a quotation to autofill...</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>#{q.id} - {q.projectTitle} ({q.clientName})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Project Name</label>
                  <input required name="name" placeholder="e.g. Modern Villa Interior" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Client Name</label>
                  <input required name="clientName" list="crm-clients-list" onChange={handleClientNameChange} placeholder="e.g. John Doe" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Org Name (Opt)</label>
                  <input name="organizationName" placeholder="e.g. Acme Corp" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Initial Status</label>
                  <select name="status" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm">
                    <option>Pre-Construction</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 flex items-center gap-1"><Calendar size={10} /> Start Date</label>
                  <input required type="date" name="startDate" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 flex items-center gap-1"><IndianRupee size={10} /> Est. Budget (₹)</label>
                  <input required type="text" inputMode="decimal" pattern="^\d*\.?\d*$" name="budget" placeholder="0" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" title="Please enter a valid number" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input type="checkbox" name="isNegotiated" id="isNegotiatedAdd" checked={isNegotiatedAdd} onChange={(e) => setIsNegotiatedAdd(e.target.checked)} className="accent-indigo-500 w-3.5 h-3.5" />
                  <label htmlFor="isNegotiatedAdd" className="text-[10px] font-bold text-slate-500 uppercase">Negotiated</label>
                </div>

                {isNegotiatedAdd && (
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-0.5">New Est. Budget</label>
                    <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" name="negotiatedBudget" placeholder="New Budget" className="w-full border-2 border-[#C9A227]/30 py-1.5 px-3 rounded-lg outline-none focus:border-[#C9A227] font-bold bg-[#C9A227]/5 text-sm" title="Please enter a valid number" />
                  </div>
                )}
                <div className={`${isNegotiatedAdd ? 'md:col-span-3' : 'md:col-span-1'}`}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                  <input name="description" placeholder="Short scope..." className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Site Address</label>
                  <input required name="address" placeholder="e.g. Kochi, Kerala" className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#C9A227] text-white py-2.5 rounded-lg font-black uppercase tracking-widest mt-2 shadow-sm text-sm">Save Work Order</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Site Info Modal */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="themed-modal rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-[#C9A227] p-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-black">Edit Project Details</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ref: #{editFormData.id}</p>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="hover:text-slate-300"><X /></button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Project Name</label>
                <input required name="name" defaultValue={editFormData.name} className="w-full themed-input border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Client Name</label>
                <input required name="clientName" list="crm-clients-list" onChange={handleClientNameChange} defaultValue={editFormData.clientName} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Organization Name</label>
                <input name="organizationName" defaultValue={editFormData.organizationName} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Project Status</label>
                <select name="status" defaultValue={editFormData.status} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm">
                  <option>Pre-Construction</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Start Date</label>
                <input type="date" name="startDate" defaultValue={editFormData.startDate} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Total Budget (₹)</label>
                <input type="text" inputMode="decimal" pattern="^\d*\.?\d*$" name="budget" defaultValue={editFormData.budget} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-emerald-600 text-sm" title="Please enter a valid number" />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input type="checkbox" name="isNegotiated" id="isNegotiatedEdit" defaultChecked={editFormData.isNegotiated} className="accent-indigo-500 w-3.5 h-3.5" />
                <label htmlFor="isNegotiatedEdit" className="text-[10px] font-bold text-slate-500 uppercase">Negotiated</label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Project Description</label>
                <input name="description" defaultValue={editFormData.description} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" placeholder="Internal notes..." />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Site Address</label>
                <input required name="address" defaultValue={editFormData.address} className="w-full border py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 font-medium text-sm" />
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-color)] flex gap-2">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 themed-card text-muted py-2 rounded-lg font-bold hover:bg-[var(--bg-card-hover)] transition text-sm">Cancel</button>
              <button type="submit" className="flex-[2] bg-[#C9A227] text-white py-2 rounded-lg font-bold shadow-lg shadow-[#C9A227]/20 hover:bg-[#B8911F] transition text-sm">Update Project Information</button>
            </div>
          </form>
        </div>
      )}

      {/* Media Upload Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMedia} className="themed-modal rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 flex justify-between items-center border-b border-[var(--border-color)]">
              <h2 className="text-lg font-black text-themed">Add Media Link</h2>
              <button type="button" onClick={() => setIsMediaModalOpen(false)} className="text-muted hover:text-themed"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Media Type</label>
                <select name="type" className="w-full border themed-input p-3 rounded-xl outline-none">
                  <option value="image">Image / Render</option>
                  <option value="video">Video Walkthrough</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caption / Room</label>
                <input required name="category" placeholder="e.g. Master Bedroom" className="w-full border themed-input p-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Media URL</label>
                <input required name="url" placeholder="https://..." className="w-full border themed-input p-3 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full bg-[#C9A227] text-white py-3 rounded-xl font-bold mt-2">Add to Gallery</button>
            </div>
          </form>
        </div>
      )}

      {/* History Log Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddHistory} className="themed-modal rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 flex justify-between items-center border-b border-[var(--border-color)]">
              <h2 className="text-lg font-black text-themed">Log Activity</h2>
              <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="text-muted hover:text-themed"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input required type="date" name="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border themed-input p-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Description</label>
                <textarea required name="desc" rows={3} placeholder="What was done?" className="w-full border themed-input p-3 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full bg-[#C9A227] text-white py-3 rounded-xl font-bold mt-2">Post to Timeline</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
