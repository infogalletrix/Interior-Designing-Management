import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";

export default function SitesPage() {
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("media"); // media, history, maintenance, financials
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form State for Editing
  const [editFormData, setEditFormData] = useState(null);

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

  useEffect(() => {
    loadSites();
    loadClients();
  }, []);

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
    if (status === "Currently working" || status === "In Progress") return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (status === "Pre-Construction" || status === "Yet to work") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    if (status === "Maintenance") return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    return "bg-slate-700/30 text-slate-300 border-slate-600/30";
  };

  // HANDLERS
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
      isArchived: s.isArchived
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const payload = {
      name: fd.get("name"),
      clientName: fd.get("clientName"),
      address: fd.get("address"),
      assignedTeam: fd.get("assignedTeam"),
      status: fd.get("status"),
      startDate: fd.get("startDate"),
      budget: parseFloat(fd.get("budget") || 0),
      description: fd.get("description"),
      isArchived: selectedSite.isArchived,
      workHistory: selectedSite.workHistory // Preserving original history
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

    // Using camelCase and ensuring NO null values for required DB columns
    const newSitePayload = {
      name: fd.get("name") || "",
      address: fd.get("address") || "",
      clientName: fd.get("clientName") || "",
      organizationName: fd.get("organizationName") || "",
      assignedTeam: fd.get("assignedTeam") || "",
      status: fd.get("status") || "Pre-Construction",
      startDate: fd.get("startDate") || new Date().toISOString().split("T")[0],
      budget: parseFloat(fd.get("budget") || 0),
      description: fd.get("description") || "",
      isArchived: false,
      workHistory: [] // Sending empty array instead of null to satisfy database
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
              <Building className="text-indigo-600" size={18} />
              Work Orders
            </h1>
            <p className="text-muted mt-0.5 text-xs font-medium">
              Manage site operations, financial links, and project progress.
            </p>
          </div>
          <button
            onClick={() => setIsSiteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition text-sm"
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
                        ? "bg-indigo-600 text-white"
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
                      className={`w-full text-left p-3 transition-all ${selectedSiteId === site.id ? "bg-indigo-500/10" : "hover:bg-white/5"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-themed text-sm">#{site.id} - {site.name}</h3>
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
                        {site.assignedTeam && (
                          <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold uppercase">
                            <Users size={9} /> {site.assignedTeam}
                          </div>
                        )}
                      </div>
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
                          onClick={() => {
                            setEditFormData(selectedSite);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 bg-[var(--accent-soft)] hover:bg-indigo-500/20 rounded-lg text-indigo-600 transition-colors"
                          title="Edit Project Details"
                        >
                          <Edit size={16} />
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
                        Project ID: #{selectedSite.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-muted text-sm border-t border-[var(--border-color)] pt-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span className="font-bold text-themed">Team Assigned:</span>{" "}
                      <span className="text-indigo-400 font-black uppercase tracking-wider">
                        {selectedSite.assignedTeam || "No Team Members Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-bold">
                        <span className="text-muted uppercase">Budget:</span>
                        <span className="text-emerald-400 ml-1">₹{selectedSite.budget?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                          className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
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
                          className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
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
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
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
                          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-themed mb-0.5">Billing & Invoices</h4>
                            <p className="text-[10px] text-muted font-medium">Generate GST/Non-GST invoices for this client.</p>
                          </div>
                          <button onClick={handleGoToBilling} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-indigo-700 transition shrink-0">
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
                    <div className="max-w-2xl mx-auto mt-4">
                      <div className="themed-card rounded-3xl p-8">
                        <div className="flex items-center gap-3 text-amber-400 mb-6">
                          <AlertTriangle size={24} />
                          <h3 className="text-lg font-black tracking-tight text-themed">Periodic Maintenance Protocol</h3>
                        </div>

                        <div className="space-y-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="required"
                              defaultChecked={selectedSite.maintenance?.required}
                              className="w-5 h-5 accent-amber-600"
                            />
                            <span className="font-bold text-themed">Enable Periodic Maintenance Alerts</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Frequency</label>
                              <select
                                name="frequency"
                                defaultValue={selectedSite.maintenance?.frequency || ""}
                                className="w-full p-3 themed-input rounded-xl outline-none focus:border-amber-500"
                              >
                                <option value="">Select frequency...</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Bi-Annually">Bi-Annually</option>
                                <option value="Yearly">Yearly</option>
                              </select>
                            </div>
                            <div></div>

                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Last Serviced</label>
                              <input
                                type="date"
                                name="lastDone"
                                defaultValue={selectedSite.maintenance?.lastDone}
                                className="w-full p-3 themed-input rounded-xl outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Next Due Date</label>
                              <input
                                type="date"
                                name="nextDue"
                                defaultValue={selectedSite.maintenance?.nextDue}
                                className="w-full p-3 themed-input rounded-xl outline-none focus:border-amber-500 font-bold text-amber-400"
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-amber-200/50">
                            <button type="button" onClick={() => showDialog({ title: "Maintenance", message: "Maintenance updated locally.", type: "success" })} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition">
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
              <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-black/20">
                <Building size={64} className="mb-4 text-slate-300" />
                <p className="font-bold text-lg uppercase tracking-widest">Select a Work Order</p>
                <p className="text-sm font-medium mt-2">View timeline, financials, media, and maintenance.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      <datalist id="crm-clients-list">
        {clients.map(c => (
          <option key={c.id} value={c.name}>{c.organizationName ? `${c.organizationName}` : ""}</option>
        ))}
      </datalist>

      {/* Site Create Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSite} className="themed-modal rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black">Create Work Order</h2>
              <button type="button" onClick={() => setIsSiteModalOpen(false)} className="hover:text-slate-300"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                  <input required name="name" placeholder="e.g. Modern Villa Interior" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                  <input required name="clientName" list="crm-clients-list" onChange={handleClientNameChange} placeholder="e.g. John Doe" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization Name (Optional)</label>
                  <input name="organizationName" placeholder="e.g. Acme Corp" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Team</label>
                  <input name="assignedTeam" placeholder="Lead + Staff" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Address</label>
                  <input required name="address" placeholder="e.g. Kochi, Kerala" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Status</label>
                  <select name="status" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium">
                    <option>Pre-Construction</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12} /> Start Date</label>
                  <input required type="date" name="startDate" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><IndianRupee size={12} /> Est. Budget (₹)</label>
                  <input required type="number" name="budget" placeholder="0" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                  <input name="description" placeholder="Short scope..." className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest mt-4 shadow-lg">Save Work Order</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Site Info Modal */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="themed-modal rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-xl font-black">Edit Project Details</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ref: #{editFormData.id}</p>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="hover:text-slate-300"><X /></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                <input required name="name" defaultValue={editFormData.name} className="w-full themed-input border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                <input required name="clientName" list="crm-clients-list" onChange={handleClientNameChange} defaultValue={editFormData.clientName} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization Name</label>
                <input name="organizationName" defaultValue={editFormData.organizationName} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Team</label>
                <input name="assignedTeam" defaultValue={editFormData.assignedTeam} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Address</label>
                <textarea required name="address" rows={2} defaultValue={editFormData.address} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Status</label>
                <select name="status" defaultValue={editFormData.status} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold">
                  <option>Pre-Construction</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                <input type="date" name="startDate" defaultValue={editFormData.startDate} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Budget (₹)</label>
                <input type="number" name="budget" defaultValue={editFormData.budget} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-emerald-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Description</label>
                <textarea name="description" rows={2} defaultValue={editFormData.description} className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 font-medium" placeholder="Internal notes or project scope..." />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-color)] flex gap-4">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 themed-card text-muted py-3 rounded-xl font-bold hover:bg-[var(--bg-card-hover)] transition">Cancel</button>
              <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">Update Project Information</button>
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
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2">Add to Gallery</button>
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
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2">Post to Timeline</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
