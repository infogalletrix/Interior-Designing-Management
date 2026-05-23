import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useLocation } from "react-router-dom";
import PrintableQuotation from "../components/PrintableQuotation";
import {
  Trash2,
  Printer,
  Save,
  RotateCcw,
  History,
  ArrowRight,
  FileText,
  Plus,
  X,
  Edit,
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";

export default function QuotationPage() {
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [clientName, setClientName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [billType, setBillType] = useState("GST"); // 'GST' | 'Non-GST'

  const [quoteId, setQuoteId] = useState(null);
  const [quoteNo, setQuoteNo] = useState("");
  const [quoteDate] = useState(new Date().toLocaleDateString("en-GB"));

  const [newItem, setNewItem] = useState({
    description: "",
    unit: "Sq.Ft",
    area: "",
    rate: "",
  });

  // ── MULTI-SESSION LOGIC ──────────────────────────────────────
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("quotation_sessions");
    return saved ? JSON.parse(saved) : [{ id: 'default', title: 'New Quote', data: null }];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem("active_quotation_session") || 'default';
  });

  // Load session data when active session changes
  useEffect(() => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (session && session.data) {
      const d = session.data;
      setItems(d.items || []);
      setClientName(d.clientName || "");
      setOrganizationName(d.organizationName || "");
      setClientAddress(d.clientAddress || "");
      setProjectTitle(d.projectTitle || "");
      setWorkDescription(d.workDescription || "");
      setBillType(d.billType || "GST");
      setQuoteId(d.quoteId || null);
      if (d.quoteNo) setQuoteNo(d.quoteNo);
    } else {
      // Clear for a new session if no data
      setItems([]);
      setClientName("");
      setOrganizationName("");
      setClientAddress("");
      setProjectTitle("");
      setWorkDescription("");
      setBillType("GST");
      setQuoteId(null);
      
      // Fetch the next quotation number from the backend
      fetch("/api/quotations/next-number")
        .then(res => res.json())
        .then(data => {
          if (data && data.nextNumber) {
            setQuoteNo(data.nextNumber);
          }
        })
        .catch(err => console.error("Failed to fetch next quote number:", err));
    }
    localStorage.setItem("active_quotation_session", activeSessionId);
  }, [activeSessionId]);

  // Persist current state to sessions array
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        title: clientName || "New Quote",
        data: { items, clientName, organizationName, clientAddress, projectTitle, workDescription, billType, quoteNo, quoteId }
      } : s));
    }, 500);
    return () => clearTimeout(timer);
  }, [items, clientName, organizationName, clientAddress, projectTitle, workDescription, billType, quoteNo, quoteId, activeSessionId]);

  useEffect(() => {
    localStorage.setItem("quotation_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: 'New Quote', data: null };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const closeSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      setSessions([{ id: 'default', title: 'New Quote', data: null }]);
      setActiveSessionId('default');
      return;
    }
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[newSessions.length - 1].id);
    }
  };

  const componentRef = useRef();
  const descRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  useEffect(() => {
    if (location.state?.newSession) {
      createNewSession();
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
  }, []);

  const addItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newItem.description || !newItem.rate) return;
    const amount =
      parseFloat(newItem.area || 1) * parseFloat(newItem.rate || 0);
    setItems([...items, { ...newItem, amount, id: Date.now() }]);
    setNewItem({ description: "", unit: "Sq.Ft", area: "", rate: "" });
    setTimeout(() => descRef.current?.focus(), 0);
  };

  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));

  const editItem = (item) => {
    setNewItem(item);
    removeItem(item.id);
  };

  const subTotal = items.reduce((s, i) => s + i.amount, 0);
  const totalArea = items.reduce(
    (s, i) => s + parseFloat(i.area || 0),
    0
  );

  const saveQuotation = async () => {
    if (!clientName || items.length === 0) {
      showDialog({ title: "Missing Information", message: "Add client name and at least one item.", type: "alert" });
      return;
    }
    const newQuote = {
      quoteNo: quoteNo || null, // Let backend assign the YY-MM-XXXX number atomically if empty
      clientName,
      organizationName,
      clientAddress,
      projectTitle,
      workDescription,
      items,
      date: quoteDate,
      total: subTotal,
      billType,
      status: "Draft"
    };
    try {
      let res;
      if (quoteId) {
        res = await fetch(`/api/quotations/${quoteId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(newQuote)
        });
      } else {
        res = await fetch('/api/quotations', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(newQuote)
        });
      }
      
      const saved = await res.json();
      // Update displayed quote number with backend-assigned value
      if (!quoteId && saved.id) {
        setQuoteId(saved.id);
      }
      if (saved.quoteNo) {
        setQuoteNo(saved.quoteNo);
        setSessions(prev => prev.map(s => s.id === activeSessionId
          ? { ...s, data: s.data ? { ...s.data, quoteNo: saved.quoteNo, quoteId: saved.id || quoteId } : s.data }
          : s
        ));
      }
      showDialog({ title: "Success", message: "Quotation Saved Successfully!", type: "success" });
    } catch(err) { console.error(err); }
  };

  // ── CONVERT TO INVOICE ──────────────────────────────────────────
  const convertToInvoice = () => {
    if (!clientName || items.length === 0) {
      showDialog({ title: "Missing Information", message: "Add client name and at least one item before converting.", type: "alert" });
      return;
    }
    
    // Navigate to billing with quote data + billType in state
    navigate("/billing", {
      state: {
        convertQuote: {
          clientName,
          organizationName,
          clientAddress,
          projectTitle,
          workDescription,
          items,
          billType,
        },
      },
    });
  };

  const clearForm = () => {
    showDialog({
      title: "Clear Form",
      message: "Clear all data?",
      type: "confirm",
      onConfirm: () => {
        setItems([]);
        setClientName("");
        setOrganizationName("");
        setClientAddress("");
        setNewItem({ description: "", unit: "Sq.Ft", area: "", rate: "" });
      }
    });
  };

  return (
    <div className="page-wrapper min-h-screen font-sans flex flex-col">
      {/* Sessions Tab Bar */}
      <div className="bg-slate-800 px-2 pt-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-700">
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
              activeSessionId === s.id 
              ? "bg-gray-200 text-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]" 
              : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
            }`}
          >
            <FileText size={12} className={activeSessionId === s.id ? "text-amber-600" : "text-slate-500"} />
            <span className="max-w-[100px] truncate">{s.title}</span>
            <button 
              onClick={(e) => closeSession(s.id, e)}
              className={`p-0.5 rounded-full hover:bg-black/10 transition ${activeSessionId === s.id ? "text-slate-400 hover:text-red-500" : "text-slate-500 hover:text-white"}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button 
          onClick={createNewSession}
          className="p-1.5 text-amber-400 hover:text-amber-300 transition hover:bg-white/5 rounded-full mb-1"
          title="New Quotation Session"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
      {/* ── TOP INFO BAR ── */}
      <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-muted uppercase">Quotation Number</label>
          <input disabled value={quoteNo}
            className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 text-sm font-bold outline-none" />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-muted uppercase">Date</label>
          <input disabled value={quoteDate}
            className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 text-sm font-bold" />
        </div>

        {/* Bill Type Toggle */}
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bill Type</label>
          <div className="flex bg-white/10 rounded p-0.5 gap-0.5">
            <button
              onClick={() => setBillType("GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "GST" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >GST</button>
            <button
              onClick={() => setBillType("Non-GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "Non-GST" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >Non-GST</button>
          </div>
        </div>

        <div className="col-span-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Client Name
          </label>
          <input
            placeholder="Enter client name..."
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-400"
          />
        </div>

        <div className="col-span-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Organization Name (Optional)
          </label>
          <input
            placeholder="e.g. Acme Corporation"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
        <div className="col-span-5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Site Address
          </label>
          <input
            placeholder="Work site / project address..."
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-400"
          />
        </div>

        <div className="col-span-5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Project Title</label>
          <input 
            placeholder="e.g. 3BHK Apartment Interior" 
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-400 font-bold" 
          />
        </div>

        <div className="col-span-2 flex flex-col items-end justify-end pb-0.5">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Sub Total</span>
          <span className="text-sm font-black text-amber-300">₹{subTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* ── ITEM ENTRY ROW ── */}
      <div className="bg-[var(--bg-surface)] p-1 grid grid-cols-12 gap-1 border-b border-[var(--border-color)]">
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-amber-400 text-center uppercase">Work Description</label>
          <input
            ref={descRef}
            placeholder="e.g. Living Room False Ceiling"
            value={newItem.description}
            onChange={(e) =>
              setNewItem({ ...newItem, description: e.target.value })
            }
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-amber-400 text-center uppercase">Unit</label>
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-orange-400"
          >
            <option>Sq.Ft</option>
            <option>L.Ft</option>
            <option>Nos</option>
            <option>LS</option>
            <option>Rmt</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-amber-400 text-center uppercase">Area / Qty</label>
          <input
            type="number"
            placeholder="0"
            value={newItem.area}
            onChange={(e) => setNewItem({ ...newItem, area: e.target.value })}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-center outline-none focus:border-orange-400"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-amber-400 text-center uppercase tracking-tighter">Rate / Unit (₹)</label>
          <input
            type="number"
            placeholder="0.00"
            value={newItem.rate}
            onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-right outline-none focus:border-orange-400 font-bold"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-amber-400 text-center uppercase">Amount (₹)</label>
          <div className="w-full bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-sm text-right font-bold text-amber-400 h-[26px]">
            {(
              parseFloat(newItem.area || 1) * parseFloat(newItem.rate || 0)
            ).toFixed(2)}
          </div>
        </div>
        <div className="col-span-1 flex items-end">
          <button onClick={addItem} type="button" className="w-full bg-orange-600 hover:bg-orange-700 text-white h-[26px] flex items-center justify-center rounded shadow-sm transition-all active:scale-95" title="Add Item to List">
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* ── MAIN TABLE ── */}
      <div className="flex-grow bg-[var(--bg-surface)] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="themed-thead border-b border-[var(--border-color)] sticky top-0">
            <tr className="uppercase text-muted font-bold">
              <th className="px-2 py-1 border-r border-gray-300 text-center w-12">
                Rem
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-10">
                S#
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-left">
                Work Description
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-16">
                Unit
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-center w-20">
                Area / Qty
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-right w-28">
                Rate / Unit (₹)
              </th>
              <th className="px-2 py-1 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={item.id} className="themed-row">
                <td className="px-2 py-1 border-r border-white/10 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => editItem(item)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center font-bold text-gray-400">
                  {idx + 1}
                </td>
                <td className="px-2 py-1 border-r border-white/10 uppercase font-medium">
                  {item.description}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center text-slate-400">
                  {item.unit}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center">
                  {item.area}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-right">
                  {parseFloat(item.rate).toFixed(2)}
                </td>
                <td className="px-2 py-1 text-right font-black text-amber-400">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="py-20 text-center text-muted font-bold uppercase tracking-widest italic"
                >
                  No work items added to quotation
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER ── */}
      <div className="bg-white/5 p-2 border-t border-gray-300 flex justify-between items-center gap-4">
        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 flex gap-2 items-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase">Total Items:</span>
            <span className="text-sm font-bold text-amber-300">{items.length}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 flex gap-2 items-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase">Total Area:</span>
            <span className="text-sm font-bold text-amber-300">{totalArea.toFixed(1)} Sq.Ft</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex items-center gap-4">
          <div className="text-4xl text-slate-400 font-light">₹</div>
          <div className="themed-card border border-[var(--border-color)] px-10 py-2 rounded shadow-inner text-right min-w-[200px]">
            <div className="text-[10px] font-bold text-amber-400 uppercase -mb-1">Estimated Total</div>
            <div className="text-5xl font-black text-amber-300 tracking-tighter">{subTotal.toFixed(2)}</div>
            {billType === 'GST' && (<div className="text-[9px] font-black uppercase mt-0.5 text-muted">Exclusive of GST</div>)}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="bg-[var(--bg-surface)] p-1 flex justify-center gap-1 border-t border-[var(--border-color)]">
        <button
          onClick={clearForm}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <RotateCcw size={14} /> Clear
        </button>
        <button
          onClick={() => navigate("/invoices", { state: { activeTab: "quotations" } })}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <History size={14} /> Quotations
        </button>
        <button
          onClick={() => handlePrint()}
          disabled={items.length === 0}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Printer size={14} /> Print
        </button>
        <button
          onClick={saveQuotation}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Save size={14} /> Save Quote
        </button>
        <button
          onClick={convertToInvoice}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <ArrowRight size={14} /> Convert to Invoice
        </button>
      </div>

      <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
        <PrintableQuotation
          ref={componentRef}
          data={{ customer: clientName, address: clientAddress, projectTitle, workDescription, items, quoteNo, date: quoteDate, billType }}
        />
      </div>
    </div>
  );
}
