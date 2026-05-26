import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  User, Briefcase, Calendar, Plus, Phone, MapPin, Search, DollarSign,
  TrendingUp, Activity, Star, CheckCircle, Clock, Mail, Tag, Percent,
  CheckSquare, BarChart2, Download, Filter, PieChart, Trash2, FileText,
  AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useDialog } from "../contexts/DialogContext";

// Light Premium Modal
function Modal({ open, onClose, children, size = "max-w-lg" }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`themed-modal rounded-[2rem] shadow-2xl p-8 w-full ${size} relative max-h-[90vh] overflow-y-auto custom-scrollbar`}>
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-red-400 text-3xl leading-none transition-colors">&times;</button>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const CRMPage = () => {
  const { showDialog } = useDialog();
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchTerm, setSearchTerm] = useState("");

  const [contacts, setContacts] = useState([]);
  const [pipeline, setPipeline] = useState({
    LEAD: { id: "LEAD", title: "LEADS", deals: [] },
    CONTACTED: { id: "CONTACTED", title: "CONTACTED", deals: [] },
    PROPOSAL: { id: "PROPOSAL", title: "PROPOSALS", deals: [] },
    NEGOTIATION: { id: "NEGOTIATION", title: "NEGOTIATING", deals: [] },
    WON: { id: "WON", title: "CLOSED WON", deals: [] },
    LOST: { id: "LOST", title: "CLOSED LOST", deals: [] },
  });
  const [activities, setActivities] = useState([]);

  const [editContact, setEditContact] = useState(null);
  const [editDeal, setEditDeal] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [feedback, setFeedback] = useState("");

  const loadData = async () => {
    try {
      const [cRes, dRes, aRes] = await Promise.all([
        fetch('/api/crm').then(res => res.json()),
        fetch('/api/crm/deals/all').then(res => res.json()),
        fetch('/api/crm/activities/all').then(res => res.json()),
      ]);
      setContacts(cRes);
      
      const newPipe = {
        LEAD: { id: "LEAD", title: "LEADS", deals: [] },
        CONTACTED: { id: "CONTACTED", title: "CONTACTED", deals: [] },
        PROPOSAL: { id: "PROPOSAL", title: "PROPOSALS", deals: [] },
        NEGOTIATION: { id: "NEGOTIATION", title: "NEGOTIATING", deals: [] },
        WON: { id: "WON", title: "CLOSED WON", deals: [] },
        LOST: { id: "LOST", title: "CLOSED LOST", deals: [] },
      };
      dRes.forEach(d => {
        const stage = d.stage || "LEAD";
        if(newPipe[stage]) {
          newPipe[stage].deals.push({ id: d.id, contactId: d.contact_id, title: d.title, value: Number(d.value), closeDate: d.close_date ? d.close_date.split('T')[0] : '' });
        }
      });
      setPipeline(newPipe);
      setActivities(aRes.map(a => ({ id: a.id, type: a.type, date: a.date ? a.date.split('T')[0] : '', client: a.client, status: a.status })));
    } catch(err) {
      console.error(err);
    }
  };

  React.useEffect(() => { loadData(); }, []);

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(""), 2500); };

  const handleContactSave = async (updated) => {
    try {
      if (!updated.id) {
        updated.id = `c${Date.now()}`;
        updated.date = new Date().toISOString().split('T')[0];
        await fetch('/api/crm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      } else {
        await fetch(`/api/crm/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      }
      loadData();
      setEditContact(null); showFeedback("Client profile saved successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const handleDealSave = async (updated) => {
    try {
      if (!updated.id) {
        updated.id = `deal-${Date.now()}`;
        updated.stage = "LEAD";
        await fetch('/api/crm/deals', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...updated, closeDate: updated.closeDate}) });
      } else {
        // Find existing stage to keep it
        let stage = "LEAD";
        for (const [key, col] of Object.entries(pipeline)) {
          if(col.deals.some(d => d.id === updated.id)) stage = key;
        }
        await fetch(`/api/crm/deals/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...updated, closeDate: updated.closeDate, stage}) });
      }
      loadData();
      setEditDeal(null); showFeedback("Project deal saved successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const handleActivitySave = async (updated) => {
    try {
      if (!updated.id) {
        await fetch('/api/crm/activities', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      } else {
        await fetch(`/api/crm/activities/${updated.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
      }
      loadData();
      setEditActivity(null); showFeedback("Activity tracked successfully");
    } catch(err) { showFeedback("Error saving"); }
  };

  const completeActivity = async (act) => {
    try {
      await fetch(`/api/crm/activities/${act.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...act, status: 'Completed'}) });
      loadData(); showFeedback("Activity marked as completed");
    } catch(err) { showFeedback("Error completing activity"); }
  };

  const deleteActivity = (id) => {
    showDialog({
      title: "Delete Activity",
      message: "Are you sure you want to delete this activity?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/crm/activities/${id}`, { method: 'DELETE' });
          loadData(); showFeedback("Activity deleted");
        } catch(err) { showFeedback("Error deleting activity"); }
      }
    });
  };

  const deleteContact = (id) => {
    showDialog({
      title: "Delete Client",
      message: "Are you sure you want to delete this client profile? Associated data might be affected.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/crm/${id}`, { method: 'DELETE' });
          loadData(); showFeedback("Client profile deleted");
        } catch(err) { showFeedback("Error deleting client"); }
      }
    });
  };

  const deleteDeal = (id) => {
    showDialog({
      title: "Delete Deal",
      message: "Are you sure you want to delete this deal? Quotations linked to this deal will also be removed.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' });
          loadData(); showFeedback("Deal deleted successfully");
        } catch(err) { showFeedback("Error deleting deal"); }
      }
    });
  };

  // --- ADVANCED METRICS (Removed Probability Weighted) ---
  const { totalValue, wonValue, activeCount } = useMemo(() => {
    let t = 0, won = 0, count = 0;
    Object.values(pipeline).forEach((col) => {
      col.deals.forEach((d) => {
        t += d.value;
        if (col.id === 'WON') won += d.value;
        else if (col.id !== 'LOST') { count++; }
      });
    });
    return { totalValue: t, wonValue: won, activeCount: count };
  }, [pipeline]);

  // --- EXPORT TO PDF ---
  const exportContactsToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("Mona Interior Studio - Client List", 14, 22);
    const tableColumn = ["Name", "Project", "Phone", "Status", "Source"];
    const tableRows = contacts.map(c => [c.name, c.project, c.phone, c.status, c.source || "N/A"]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 37, 36] } });
    doc.save("clients_report.pdf");
    showFeedback("PDF Report Exported!");
  };

  // Filters
  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.project.toLowerCase().includes(searchTerm.toLowerCase()) || (c.tags && c.tags.join(" ").toLowerCase().includes(searchTerm.toLowerCase())));
  const filteredActivities = activities.filter((a) => {
    const clientName = contacts.find(c => c.id === a.client)?.name || "";
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const sourceCol = pipeline[source.droppableId];
    const destCol = pipeline[destination.droppableId];
    const sourceDeals = [...sourceCol.deals];
    const destDeals = [...destCol.deals];
    const [movedDeal] = sourceDeals.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
      sourceDeals.splice(destination.index, 0, movedDeal);
      setPipeline({ ...pipeline, [source.droppableId]: { ...sourceCol, deals: sourceDeals } });
    } else {
      destDeals.splice(destination.index, 0, movedDeal);
      setPipeline({ ...pipeline, [source.droppableId]: { ...sourceCol, deals: sourceDeals }, [destination.droppableId]: { ...destCol, deals: destDeals } });
      
      // Update in DB
      try {
        await fetch(`/api/crm/deals/${movedDeal.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...movedDeal, stage: destination.droppableId})
        });
      } catch (e) {
        console.error("Failed to update deal stage", e);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 page-wrapper">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full dark:bg-violet-600/15 bg-orange-300/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full dark:bg-indigo-600/10 bg-amber-200/10 blur-[120px]" />
      </div>

      {/* HEADER & TABS */}
      <div className="flex flex-col mb-4 gap-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row items-center justify-between gap-3 w-full">
          
          {/* TABS (Left) */}
          <div className="flex w-full md:w-auto gap-1 p-1 rounded-xl border border-[var(--border-color)] themed-card shadow-sm overflow-x-auto order-2 lg:order-1">
            {[
              { id: "contacts", label: "Clients", icon: <User size={14} /> },
              { id: "deals", label: "Pipeline", icon: <Briefcase size={14} /> },
              { id: "activities", label: "Schedule", icon: <Calendar size={14} /> },
              { id: "insights", label: "Insights", icon: <BarChart2 size={14} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(""); }} className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === tab.id ? "dark:bg-violet-600 bg-[#D4AF37] text-white shadow-md" : "text-muted hover:text-themed hover:bg-[var(--bg-card-hover)]"}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SEARCH BAR (Middle) */}
          <div className="relative w-full lg:w-96 group shadow-sm rounded-xl order-1 lg:order-2 flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-themed transition-colors" size={16} />
            <input type="text" placeholder={`Search ${activeTab}...`} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] themed-input text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {/* ADD BUTTON (Right) */}
          <div className="flex w-full md:w-auto order-3">
            <button onClick={() => { if (activeTab === "contacts") setEditContact({ status: 'Cold', tags: [] }); else if (activeTab === "deals") setEditDeal({ value: 0, contactId: contacts[0]?.id || '' }); else setEditActivity({ type: '', date: new Date().toISOString().split('T')[0], client: contacts[0]?.id || '', status: 'Pending' }); }} className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 dark:bg-violet-700 bg-[#D4AF37] text-white shadow-lg dark:hover:bg-slate-800 hover:bg-[#c4a133]">
              <Plus size={16} /> <span className="hidden sm:inline">Add New</span>
            </button>
          </div>

        </motion.div>
      </div>

      {/* MAIN CONTENT AREA */}
      <motion.div layout className="themed-card rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px]">
        
        {/* SECTION: DEALS (KANBAN) */}
        {activeTab === "deals" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-5 overflow-x-auto w-full">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex flex-row gap-2 sm:gap-3 w-full min-w-[1200px]">
                {Object.values(pipeline).map((column) => (
                  <div key={column.id} className="flex-1 min-w-0 flex flex-col themed-card rounded-[1.25rem] p-2 sm:p-3">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-3 gap-1">
                      <h3 className="text-[9px] sm:text-[10px] font-black text-slate-500 tracking-widest uppercase truncate">{column.title}</h3>
                      <span className="themed-card text-muted border border-[var(--border-color)] text-[10px] font-black px-2 py-0.5 rounded-md self-start xl:self-auto">{column.deals.length}</span>
                    </div>
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 min-h-[300px] rounded-[1rem] transition-colors ${snapshot.isDraggingOver ? "bg-violet-500/10 border-2 border-dashed border-violet-500/40 p-1" : ""}`}>
                          {column.deals.filter((d) => d.title.toLowerCase().includes(searchTerm.toLowerCase())).map((deal, index) => {
                            const contact = contacts.find((c) => c.id === deal.contactId);

                            return (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`themed-card p-3 sm:p-4 rounded-xl border mb-3 transition-all ${snapshot.isDragging ? "shadow-2xl border-violet-500/50 scale-[1.02] rotate-1" : "shadow-sm hover:border-violet-500/30 hover:shadow-md hover:-translate-y-1"}`}>
                                    <div className="mb-2">
                                      <h4 className="font-black text-themed text-xs sm:text-sm leading-snug truncate">{deal.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-5 h-5 rounded-md dark:bg-violet-600 bg-[#D4AF37] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{contact?.name.charAt(0) || '?'}</div>
                                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 truncate">{contact?.name || 'Unknown'}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 mb-4">
                                      <Phone size={12} className="text-slate-500" /> {contact?.phone || 'N/A'}
                                    </div>
                                    <div className="text-xs sm:text-sm font-black text-emerald-400 mb-3 bg-emerald-500/10 w-max px-2 py-0.5 rounded-md border border-emerald-500/20">₹{(deal.value/100000).toFixed(2)}L</div>
                                    
                                    <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                                      <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-500 truncate"><Clock size={10} /> {new Date(deal.closeDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</span>
                                      <div className="flex gap-1">
                                        <button className="text-[9px] sm:text-[10px] font-bold text-muted hover:text-themed px-2 py-1 themed-card rounded-md transition-colors hover:bg-violet-600/30" onClick={() => setEditDeal({ ...deal })}>Edit</button>
                                        <button className="text-[9px] sm:text-[10px] font-bold text-red-400 hover:text-red-300 px-1.5 py-1 themed-card rounded-md transition-colors hover:bg-red-500/20" onClick={() => deleteDeal(deal.id)}><Trash2 size={12}/></button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </motion.div>
        )}

        {/* SECTION: CLIENTS */}
        {activeTab === "contacts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
            <div className="flex justify-between items-center p-6 themed-thead border-b border-[var(--border-color)]">
              <h2 className="text-lg font-black text-themed">Client Directory</h2>
              <button onClick={exportContactsToPDF} className="flex items-center gap-2 themed-card text-muted px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-600/20 transition-colors"><Download size={16}/> Export PDF</button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="themed-thead border-b border-[var(--border-color)]">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 pl-8">Client Profile</th>
                  <th className="p-5">Project Focus</th>
                  <th className="p-5">Tags / Source</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5 pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-divider">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className="themed-row transition-colors group">
                    <td className="p-5 pl-8">
                      <div className="flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=292524&color=fff&rounded=xl&bold=true`} alt={c.name} className="w-10 h-10 rounded-xl shadow-sm"/>
                        <div>
                          <div className="font-black text-themed">{c.name}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID: {c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-white/5 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10">{c.project}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {c.tags?.map(t => <span key={t} className="themed-card text-muted text-[9px] font-black uppercase px-2 py-0.5 rounded"><Tag size={8} className="inline mr-1"/>{t}</span>)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Filter size={10}/> {c.source || 'Unknown'}</div>
                    </td>
                    <td className="p-5 text-slate-400 text-xs font-medium space-y-1">
                      <div className="flex items-center gap-2"><Phone size={12} className="text-slate-500" /> {c.phone}</div>
                      <div className="flex items-center gap-2"><Mail size={12} className="text-slate-500" /> {c.email || 'N/A'}</div>
                    </td>
                    <td className="p-5 pr-8 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button className="text-slate-400 hover:text-white font-bold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs" onClick={() => setEditContact(c)}>Edit</button>
                        <button className="text-red-400 hover:text-red-300 font-bold px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-xs" onClick={() => deleteContact(c.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* SECTION: ACTIVITIES */}
        {activeTab === "activities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[{ type: "Follow-up Call", icon: <Phone size={18} />, color: "blue" }, { type: "Site Visit", icon: <MapPin size={18} />, color: "orange" }, { type: "Send Quotation", icon: <DollarSign size={18} />, color: "emerald" }].map(({ type, icon, color }) => (
                <button key={type} onClick={() => setEditActivity({ type: type, date: new Date().toISOString().split('T')[0], client: contacts[0]?.id || '', status: 'Pending' })} className="flex items-center justify-between p-4 themed-card rounded-2xl hover:border-violet-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`bg-${color}-50 text-${color}-600 p-2.5 rounded-xl border border-${color}-100 group-hover:scale-110 transition-transform`}>{icon}</div>
                    <span className="font-bold text-themed text-sm">{type}</span>
                  </div>
                  <Plus size={16} className="text-slate-500 group-hover:text-white" />
                </button>
              ))}
            </div>
            <div className="themed-card rounded-[2rem] p-6 lg:p-8">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={14} /> Upcoming Schedule</h3>
              <div className="space-y-3">
                {filteredActivities.sort((a,b) => new Date(a.date) - new Date(b.date)).map((act) => {
                  const contact = contacts.find(c => c.id === act.client);
                  const isOverdue = new Date(act.date) < new Date() && act.status !== 'Completed';
                  const displayStatus = isOverdue ? 'Overdue' : act.status;
                  const actDate = new Date(act.date);
                  return (
                    <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 themed-card rounded-xl shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-4 items-center">
                        <div className="themed-card px-3 py-2 rounded-lg text-center min-w-[60px]">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{actDate.toLocaleString('default', { month: 'short' })}</p>
                          <p className="text-lg font-black text-themed">{actDate.getDate()}</p>
                        </div>
                        <div>
                          <p className="font-black text-white text-sm mb-0.5">{act.type}</p>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><User size={12} /> {contact ? contact.name : "Unknown Client"} <span className="ml-2 flex items-center gap-1 text-slate-500"><Clock size={12}/> {actDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 border-white/10 pt-3 sm:pt-0">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-md ${
                          displayStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          displayStatus === 'Overdue' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {displayStatus === 'Completed' ? <CheckCircle size={12} /> : displayStatus === 'Pending' ? <Clock size={12} /> : <Calendar size={12} />}{displayStatus}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                           {act.status !== 'Completed' && (
                             <button title="Mark Completed" className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 text-xs flex items-center gap-1" onClick={() => completeActivity(act)}><CheckCircle size={14}/></button>
                           )}
                           <button className="text-muted hover:text-themed font-bold px-3 py-1.5 rounded-lg themed-card hover:bg-[var(--accent-soft)] transition-colors border border-[var(--border-color)] text-xs" onClick={() => setEditActivity(act)}>Edit</button>
                           <button title="Delete Activity" className="text-red-400 hover:text-red-300 font-bold px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20 text-xs flex items-center gap-1" onClick={() => deleteActivity(act.id)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION: INSIGHTS & ANALYTICS */}
        {activeTab === "insights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 space-y-8">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="themed-card p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={100} className="text-white" /></div>
                <h3 className="text-slate-400 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Total Pipeline</h3>
                <div className="text-3xl font-black text-themed">₹{(totalValue / 100000).toFixed(2)}L</div>
                <div className="mt-3 flex items-center text-xs font-bold text-slate-400">All Deals Pipeline Value</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={100} className="text-emerald-400" /></div>
                <h3 className="text-emerald-400 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Percent size={14}/> Closed Revenue</h3>
                <div className="text-3xl font-black text-emerald-400">₹{(wonValue / 100000).toFixed(2)}L</div>
                <div className="mt-3 flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 w-max px-2 py-0.5 rounded-lg border border-emerald-500/20">Revenue successfully closed</div>
              </div>
              <div className="dark:bg-blue-500/10 bg-amber-500/10 dark:border-blue-500/20 border-amber-500/20 border p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase size={100} className="dark:text-blue-400 text-amber-500" /></div>
                <h3 className="dark:text-blue-400 text-amber-600 font-bold text-xs mb-2 uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Active Projects</h3>
                <div className="text-3xl font-black dark:text-blue-400 text-amber-600">{activeCount}</div>
                <div className="mt-3 flex items-center text-xs font-bold dark:text-blue-400 text-amber-600 dark:bg-blue-500/10 bg-amber-500/10 w-max px-2 py-0.5 rounded-lg dark:border-blue-500/20 border-amber-500/20 border">Currently in pipeline</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pipeline Funnel */}
              <div className="themed-card rounded-[2rem] p-6">
                <h3 className="text-sm font-black text-themed mb-6 flex items-center gap-2"><Filter size={16}/> Sales Funnel</h3>
                <div className="space-y-4">
                  {Object.values(pipeline).filter(c => c.id !== 'LOST').map((col, i) => {
                    const totalVal = col.deals.reduce((a, b) => a + b.value, 0);
                    const percentage = totalValue === 0 ? 0 : Math.max(5, (totalVal / totalValue) * 100);
                    return (
                      <div key={col.id} className="relative">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                          <span>{col.title} ({col.deals.length})</span>
                          <span>₹{(totalVal/100000).toFixed(2)}L</span>
                        </div>
                        <div className="h-4 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
                          <div className="h-full dark:bg-violet-500 bg-[#D4AF37] rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead Sources & Win Rate */}
              <div className="space-y-6">
                <div className="themed-card rounded-[2rem] p-6">
                  <h3 className="text-sm font-black text-themed mb-4 flex items-center gap-2"><PieChart size={16}/> Lead Sources</h3>
                  <div className="space-y-3">
                    {Array.from(new Set(contacts.map(c => c.source || 'Other'))).map(source => {
                      const count = contacts.filter(c => (c.source || 'Other') === source).length;
                      if (count === 0) return null;
                      return (
                        <div key={source} className="flex justify-between items-center p-3 themed-card rounded-xl">
                          <span className="text-xs font-bold text-themed">{source}</span>
                          <span className="text-xs font-black themed-card px-2 py-1 rounded text-themed">{count} Clients</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="dark:bg-violet-700 bg-[#D4AF37] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10"><Activity size={100} /></div>
                  <h3 className="text-sm font-black dark:text-violet-300 text-orange-100 mb-2 uppercase tracking-widest">Win Rate</h3>
                  <div className="text-4xl font-black text-white">
                    {totalValue > 0 ? Math.round((wonValue / totalValue) * 100) : 0}%
                  </div>
                  <p className="text-xs dark:text-violet-300 text-orange-100 mt-2 font-medium">Of total pipeline value successfully closed.</p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </motion.div>

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 right-8 bg-violet-700 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 font-bold border border-stone-700">
            <CheckCircle size={20} className="text-emerald-400" />{feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <Modal open={!!editContact} onClose={() => setEditContact(null)}>
        {editContact && <EditContactForm contact={editContact} onSave={handleContactSave} onCancel={() => setEditContact(null)} />}
      </Modal>

      <Modal open={!!editDeal} onClose={() => setEditDeal(null)}>
        {editDeal && <EditDealForm deal={editDeal} contacts={contacts} onSave={handleDealSave} onCancel={() => setEditDeal(null)} />}
      </Modal>

      <Modal open={!!editActivity} onClose={() => setEditActivity(null)}>
        {editActivity && <EditActivityForm activity={editActivity} contacts={contacts} onSave={handleActivitySave} onCancel={() => setEditActivity(null)} />}
      </Modal>
    </div>
  );
};

// --- EXTENDED FORMS ---
function EditContactForm({ contact, onSave, onCancel }) {
  const [form, setForm] = useState(contact || { name: '', organizationName: '', project: '', phone: '', email: '', address: '', status: 'Cold', source: '', tags: [] });
  const [tagInput, setTagInput] = useState("");

  const addTag = () => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm({...form, tags: [...form.tags, tagInput.trim()]}); setTagInput(""); } };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-themed tracking-tight">Client Profile</h2>
      <p className="text-muted font-medium text-sm mb-6 pb-4 border-b border-[var(--border-color)]">Comprehensive details for your design client.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Organization Name (Optional)</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.organizationName || ''} onChange={e => setForm({ ...form, organizationName: e.target.value })} placeholder="e.g. Acme Corp" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Project Focus</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Physical Address</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          {/* Replaced fixed select with input + datalist so ANY lead source can be entered */}
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Lead Source</label>
          <input list="lead-sources" placeholder="e.g. Instagram" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white font-bold focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
          <datalist id="lead-sources">
            <option value="Instagram" />
            <option value="Website" />
            <option value="Referral" />
            <option value="Direct Walk-in" />
          </datalist>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-[var(--border-color)]">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold dark:bg-violet-700 bg-[#D4AF37] text-white shadow-md dark:hover:bg-slate-800 hover:bg-[#c4a133] transition-all">Save Profile</button>
      </div>
    </form>
  );
}

function EditDealForm({ deal, contacts, onSave, onCancel }) {
  const initialContact = contacts.find(c => c.id == deal?.contactId);
  const [form, setForm] = useState({ 
    title: deal?.title || '', 
    value: deal?.value || 0, 
    contactName: initialContact?.name || '', 
    closeDate: deal?.closeDate || new Date().toISOString().split('T')[0],
    id: deal?.id
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = contacts.find(c => c.name.toLowerCase() === form.contactName.trim().toLowerCase());
    onSave({
      id: form.id,
      title: form.title,
      value: form.value,
      closeDate: form.closeDate,
      contactId: existing ? existing.id.toString() : form.contactName.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-themed tracking-tight">Project Deal</h2>
      <p className="text-muted font-medium text-sm mb-6 pb-4 border-b border-[var(--border-color)]">Track and update the estimated budget and assign to a client.</p>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Deal Title</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Client (Optional)</label>
          <input 
            list="client-list"
            placeholder="Type new or select existing..."
            className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" 
            value={form.contactName} 
            onChange={e => setForm({ ...form, contactName: e.target.value })} 
          />
          <datalist id="client-list">
            {contacts.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Est. Value (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
            <input className="w-full bg-black/20 border border-white/10 rounded-xl p-3 pl-9 text-sm text-white font-black focus:ring-2 focus:ring-stone-900 outline-none transition-all" value={form.value} onChange={e => setForm({ ...form, value: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1') })} type="text" inputMode="decimal" pattern="^\d*\.?\d*$" required min="0" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-[var(--border-color)]">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold dark:bg-violet-700 bg-[#D4AF37] text-white shadow-md dark:hover:bg-slate-800 hover:bg-[#c4a133] transition-all">Save Project</button>
      </div>
    </form>
  );
}

function EditActivityForm({ activity, contacts, onSave, onCancel }) {
  // We manage date and time separately in the form state, but combine them on save.
  const defaultDateStr = activity?.date || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const initialDate = defaultDateStr.split('T')[0];
  const initialTime = defaultDateStr.split('T')[1] || '12:00';
  const initialContact = contacts.find(c => c.id == activity?.client);

  const [form, setForm] = useState({ 
    id: activity?.id,
    type: activity?.type || '', 
    datePart: initialDate,
    timePart: initialTime,
    contactName: initialContact?.name || '', 
    status: activity?.status || 'Pending' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = contacts.find(c => c.name.toLowerCase() === form.contactName.trim().toLowerCase());
    
    onSave({
      id: form.id,
      type: form.type,
      date: `${form.datePart}T${form.timePart}`,
      client: existing ? existing.id.toString() : form.contactName.trim(),
      status: form.status || 'Pending'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="font-black text-3xl mb-1 text-themed tracking-tight">Schedule Activity</h2>
      <p className="text-muted font-medium text-sm mb-6 pb-4 border-b border-[var(--border-color)]">Plan your meetings, site visits, and calls.</p>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Activity Title/Type</label>
          <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required placeholder="e.g. Discuss Floor Plan" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Date</label>
            <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.datePart} onChange={e => setForm({ ...form, datePart: e.target.value })} type="date" required />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Time</label>
            <input className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" value={form.timePart} onChange={e => setForm({ ...form, timePart: e.target.value })} type="time" required />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Client (Optional)</label>
          <input 
            list="activity-client-list"
            placeholder="Type new or select existing..."
            className="themed-input w-full border border-[var(--border-color)] rounded-xl p-3 text-sm font-bold outline-none focus:border-violet-500 transition-all" 
            value={form.contactName} 
            onChange={e => setForm({ ...form, contactName: e.target.value })} 
          />
          <datalist id="activity-client-list">
            {contacts.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-[var(--border-color)]">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold dark:bg-violet-700 bg-[#D4AF37] text-white shadow-md dark:hover:bg-slate-800 hover:bg-[#c4a133] transition-all">Save Schedule</button>
      </div>
    </form>
  );
}

export default CRMPage;
