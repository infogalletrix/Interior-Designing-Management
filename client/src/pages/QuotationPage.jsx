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
import NotificationWidget from "../components/NotificationWidget";

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



  const [crmClients, setCrmClients] = useState([]);

  // Fetch CRM clients on mount
  useEffect(() => {
    fetch('/api/crm')
      .then(res => res.json())
      .then(data => setCrmClients(data))
      .catch(err => console.error("Failed to load CRM clients", err));
  }, []);

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
      setItems([{ id: Date.now(), description: "", unit: "Sq.Ft", area: "", rate: "", amount: 0 }]);
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
    if (location.state?.editQuote) {
      const q = location.state.editQuote;
      const newId = `session-${Date.now()}`;
      const newSession = {
        id: newId,
        title: q.clientName || 'Edit Quote',
        data: {
          items: q.items || [],
          clientName: q.clientName || "",
          organizationName: q.organizationName || "",
          clientAddress: q.clientAddress || "",
          projectTitle: q.projectTitle || "",
          workDescription: q.workDescription || "",
          billType: q.billType || "GST",
          quoteNo: q.quoteNo || "",
          quoteId: q.id || null
        }
      };
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(newId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const handleItemChange = (id, field, value) => {
    setItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          const area = parseFloat(updatedItem.area || 0);
          const rate = parseFloat(updatedItem.rate || 0);
          const amount = area * rate;
          return { ...updatedItem, amount };
        }
        return item;
      });
    });
  };

  const handleKeyDown = (e, idx, field) => {
    const fields = ["description", "area", "rate"];

    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === items.length - 1) {
        addNewRow();
        setTimeout(() => {
          const nextInput = document.getElementById(`input-${idx + 1}-description`);
          if (nextInput) nextInput.focus();
        }, 50);
      } else {
        const nextInput = document.getElementById(`input-${idx + 1}-${field}`);
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${idx + 1}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${idx - 1}-${field}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === "ArrowRight") {
      if (e.target.selectionStart === e.target.value.length) {
        e.preventDefault();
        const fieldIdx = fields.indexOf(field);
        if (fieldIdx < fields.length - 1) {
          const nextInput = document.getElementById(`input-${idx}-${fields[fieldIdx + 1]}`);
          if (nextInput) nextInput.focus();
        }
      }
    } else if (e.key === "ArrowLeft") {
      if (e.target.selectionEnd === 0) {
        e.preventDefault();
        const fieldIdx = fields.indexOf(field);
        if (fieldIdx > 0) {
          const prevInput = document.getElementById(`input-${idx}-${fields[fieldIdx - 1]}`);
          if (prevInput) prevInput.focus();
        }
      }
    }
  };

  const addNewRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        description: "",
        unit: "Sq.Ft",
        area: "",
        rate: "",
        amount: 0,
      },
    ]);
  };

  const removeItem = (id) => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === 0) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, description: "", area: "", rate: "", amount: 0 } : item));
    } else {
      setItems(items.filter((i) => i.id !== id));
    }
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
      setTimeout(() => {
        if (!quoteId) {
          // Reset the form for the next quotation
          setItems([{ id: Date.now(), description: "", unit: "Sq.Ft", area: "", rate: "", amount: 0 }]);
          setClientName("");
          setOrganizationName("");
          setClientAddress("");
          setProjectTitle("");
          setWorkDescription("");
          setQuoteId(null);
          fetch("/api/quotations/next-number")
            .then(res => res.json())
            .then(data => { if (data && data.nextNumber) setQuoteNo(data.nextNumber); })
            .catch(() => setQuoteNo(""));
        }
      }, 1500);
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

  const convertToWorkOrder = () => {
    if (!clientName || items.length === 0) {
      showDialog({ title: "Missing Information", message: "Add client name and at least one item before converting.", type: "alert" });
      return;
    }
    
    navigate("/sites", {
      state: {
        convertQuote: {
          id: quoteId,
          clientName,
          organizationName,
          clientAddress,
          projectTitle,
          workDescription,
          totalAmount: subTotal,
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
        setItems([{ id: Date.now(), description: "", unit: "Sq.Ft", area: "", rate: "", amount: 0 }]);
        setClientName("");
        setOrganizationName("");
        setClientAddress("");
      }
    });
  };

  return (
    <div className="page-wrapper min-h-screen font-sans flex flex-col">
      {/* Sessions Tab Bar */}
      <div className="bg-[var(--bg-surface)] px-2 pt-2 flex items-center justify-between border-b border-[var(--border-color)] relative z-50">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                activeSessionId === s.id 
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-b-0 border-[var(--border-color)] shadow-sm" 
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FileText size={12} className={activeSessionId === s.id ? "text-[var(--accent)]" : "opacity-40"} />
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
            className="p-1.5 text-[var(--accent)] hover:opacity-70 transition hover:bg-[var(--accent-soft)] rounded-full mb-1"
            title="New Quotation Session"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
        <div className="pb-1 pl-2 shrink-0">
          <NotificationWidget compact={true} />
        </div>
      </div>
      {/* ── TOP INFO BAR ── */}
      <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-muted uppercase">Quotation Number</label>
          <input disabled value={quoteNo}
            className="w-full bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-amber-800 dark:text-[var(--accent)] px-2 py-1 text-sm font-bold outline-none rounded" />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-muted uppercase">Date</label>
          <input disabled value={quoteDate}
            className="w-full bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-amber-800 dark:text-[var(--accent)] px-2 py-1 text-sm font-bold rounded" />
        </div>

        {/* Bill Type Toggle */}
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bill Type</label>
          <div className="flex bg-white/10 rounded p-0.5 gap-0.5">
            <button
              onClick={() => setBillType("GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "GST" ? "bg-amber-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
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
            list="crm-clients-list-quotation"
            placeholder="Enter client name..."
            value={clientName}
            onChange={(e) => {
              const val = e.target.value;
              setClientName(val);
              const matchedClient = crmClients.find(c => c.name.toLowerCase() === val.toLowerCase());
              if (matchedClient) {
                if (!organizationName && matchedClient.organizationName) {
                  setOrganizationName(matchedClient.organizationName);
                }
              }
            }}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-400"
          />
          <datalist id="crm-clients-list-quotation">
            {crmClients.map(c => (
              <option key={c.id} value={c.name}>{c.organizationName ? `${c.organizationName}` : ""}</option>
            ))}
          </datalist>
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
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-amber-500 font-bold" 
          />
        </div>

        <div className="col-span-2 flex flex-col items-end justify-end pb-0.5">
          <span className="text-[9px] font-bold text-amber-700 dark:text-[var(--accent)] uppercase tracking-widest">Sub Total</span>
          <span className="text-sm font-black text-amber-700 dark:text-[var(--accent)]">₹{subTotal.toLocaleString()}</span>
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
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title={idx === 0 ? "Clear Row" : "Remove Row"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center font-bold text-gray-400">
                  {idx + 1}
                </td>
                <td className="px-1 py-1 border-r border-white/10">
                  <input
                    id={`input-${idx}-description`}
                    type="text"
                    placeholder={idx === 0 ? "Work description..." : ""}
                    value={item.description || ""}
                    onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idx, "description")}
                    className="w-full bg-transparent border-none outline-none text-themed font-medium px-1 placeholder-slate-600"
                  />
                </td>
                <td className="px-1 py-1 border-r border-white/10">
                  <select
                    id={`input-${idx}-unit`}
                    tabIndex="-1"
                    value={item.unit || "Sq.Ft"}
                    onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idx, "unit")}
                    className="w-full bg-transparent border-none outline-none text-slate-400 text-center appearance-none cursor-pointer"
                  >
                    <option className="bg-slate-800 text-white">Sq.Ft</option>
                    <option className="bg-slate-800 text-white">L.Ft</option>
                    <option className="bg-slate-800 text-white">Nos</option>
                    <option className="bg-slate-800 text-white">LS</option>
                    <option className="bg-slate-800 text-white">Rmt</option>
                  </select>
                </td>
                <td className="px-1 py-1 border-r border-white/10">
                  <input
                    id={`input-${idx}-area`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={item.area || ""}
                    onChange={(e) => handleItemChange(item.id, "area", e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
                    onKeyDown={(e) => handleKeyDown(e, idx, "area")}
                    className="w-full bg-transparent border-none outline-none text-center text-themed px-1"
                  />
                </td>
                <td className="px-1 py-1 border-r border-white/10">
                  <input
                    id={`input-${idx}-rate`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.rate || ""}
                    onChange={(e) => handleItemChange(item.id, "rate", e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
                    onKeyDown={(e) => handleKeyDown(e, idx, "rate")}
                    className="w-full bg-transparent border-none outline-none text-right text-themed px-1"
                  />
                </td>
                <td className="px-2 py-2 text-right font-black text-amber-700 dark:text-[var(--accent)]">
                  {(item.amount || 0).toFixed(2)}
                </td>
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
        <div className="p-2 border-b border-[var(--border-color)] flex justify-center">
          <button 
            onClick={addNewRow}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--accent-soft)] text-amber-800 dark:text-[var(--accent)] rounded-lg font-bold text-xs hover:opacity-80 transition-all border border-[var(--accent)]/30"
          >
            <Plus size={14} strokeWidth={3} /> Add Row
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="bg-[var(--bg-surface)] p-2 border-t border-[var(--border-color)] flex justify-between items-center gap-4">
        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/30 px-3 py-1 flex gap-2 items-center rounded">
            <span className="text-[10px] font-bold text-amber-800 dark:text-[var(--accent)] uppercase">Total Items:</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{items.length}</span>
          </div>
          <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/30 px-3 py-1 flex gap-2 items-center rounded">
            <span className="text-[10px] font-bold text-amber-800 dark:text-[var(--accent)] uppercase">Total Area:</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{totalArea.toFixed(1)} Sq.Ft</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex items-center gap-4">
          <div className="text-4xl text-amber-700 dark:text-[var(--accent)] font-light">₹</div>
          <div className="themed-card border border-[var(--border-color)] px-10 py-2 rounded shadow-inner text-right min-w-[200px]">
            <div className="text-[10px] font-bold text-amber-700 dark:text-[var(--accent)] uppercase -mb-1">Estimated Total</div>
            <div className="text-5xl font-black text-amber-700 dark:text-[var(--accent)] tracking-tighter">{subTotal.toFixed(2)}</div>
            {billType === 'GST' && (<div className="text-[9px] font-black uppercase mt-0.5 text-muted">Exclusive of GST</div>)}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="bg-[var(--bg-surface)] p-1 flex justify-center gap-1 border-t border-[var(--border-color)]">
        <button
          onClick={clearForm}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <RotateCcw size={14} /> Clear
        </button>
        <button
          onClick={() => navigate("/invoices", { state: { activeTab: "quotations" } })}
          className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <History size={14} /> Quotations
        </button>
        <button
          onClick={async () => { await saveQuotation(); handlePrint(); }}
          disabled={items.length === 0}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Printer size={14} /> Generate & Print
        </button>
        <button
          onClick={saveQuotation}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Save size={14} /> Generate
        </button>
        <button
          onClick={convertToInvoice}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <ArrowRight size={14} /> Convert to Invoice
        </button>
        <button
          onClick={convertToWorkOrder}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <ArrowRight size={14} /> Convert to Work Order
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
