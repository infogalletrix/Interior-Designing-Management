import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { useLocation } from "react-router-dom";
import { Receipt, Printer, History, User, Calendar, IndianRupee, Trash2, Save, ArrowLeft, Building, X, CheckCircle2, Search, MapPin } from "lucide-react";
import { useDialog } from "../contexts/DialogContext";
import SearchableSelect from "../components/SearchableSelect";

export default function ReceiptPage() {
  const { showDialog } = useDialog();
  const location = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [sites, setSites] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateAction, setGenerateAction] = useState(null); // 'generate' or 'print'

  const [receipts, setReceipts] = useState([]);
  const [selectedReceipts, setSelectedReceipts] = useState([]);

  const getNewReceiptNumber = () => {
    const lastNum = localStorage.getItem("lastReceiptNumber") || "1000";
    const newNum = parseInt(lastNum) + 1;
    const yearSuffix = "26-27";
    return `MI/RCP/${newNum}/${yearSuffix}`;
  };

  const [formData, setFormData] = useState({
    receiptNo: getNewReceiptNumber(),
    date: new Date().toISOString().split("T")[0],
    siteId: "",
    clientName: "",
    totalAmount: "",
    category: "Advance Payment",
    description: "",
    comments: "",
    paymentMode: "Cash"
  });

  const [printData, setPrintData] = useState([]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) {
          const data = await res.json();
          setSites(data);
        }
      } catch (err) {
        console.error("Failed to fetch sites:", err);
      }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const res = await fetch('/api/finance/receipts');
        if (res.ok) {
          const data = await res.json();
          setReceipts(data.map(r => ({
             ...r,
             totalAmount: r.totalAmount || "0",
             amountPaid: r.amountPaid !== undefined ? r.amountPaid : 0,
             remainingAmount: r.remainingAmount !== undefined ? r.remainingAmount : 0,
             status: r.status || "Completed"
          })));
        }
      } catch (err) {
        console.error("Failed to fetch receipts:", err);
      }
    };
    fetchReceipts();
  }, []);

  useEffect(() => {
    if (location.state?.autoFill) {
      const { name, desc, siteId, organizationName, amountPaid, category } = location.state.autoFill;
      if(siteId) setSelectedSiteId(parseInt(siteId));
      setFormData(prev => ({ 
        ...prev, 
        siteId: siteId || "",
        clientName: organizationName || name || "", 
        description: desc || "",
        totalAmount: amountPaid ? amountPaid.toString() : prev.totalAmount,
        category: category || prev.category
      }));
      setShowHistory(false);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedSiteId) {
      const site = sites.find(s => s.id === selectedSiteId);
      if (site) {
        let clientNm = site.organizationName || site.clientName;
        let desc = site.name;
        setFormData(prev => ({
          ...prev,
          siteId: site.id,
          clientName: clientNm,
          description: desc
        }));
      }
    }
  }, [selectedSiteId, sites]);

  const componentRef = useRef();
  const handlePrintAction = useReactToPrint({ contentRef: componentRef });

  const validateForm = () => {
    if (!formData.siteId) {
      showDialog({ title: "Validation Error", message: "Work Order must be selected.", type: "error" });
      return false;
    }
    if (!formData.clientName || !formData.totalAmount || !formData.description) {
      showDialog({ title: "Validation Error", message: "Please fill all required fields.", type: "error" });
      return false;
    }
    return true;
  };

  const saveAsDraft = async () => {
    if (!validateForm()) return;
    const newReceipt = { 
      ...formData, 
      status: "Draft",
      receiptNo: "DRAFT",
      amountPaid: 0,
      siteId: formData.siteId ? formData.siteId.toString() : "",
      totalAmount: parseFloat(formData.totalAmount) || 0,
      remainingAmount: parseFloat(formData.totalAmount) || 0
    };
    try {
      const res = await fetch('/api/finance/receipts', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReceipt)
      });
      if (res.ok) {
        const saved = await res.json();
        setReceipts([{...newReceipt, id: saved.id}, ...receipts]);
        showDialog({ title: "Saved as Draft", message: "Receipt draft saved successfully.", type: "success" });
        resetForm();
      }
    } catch(err) {
      console.error(err);
      showDialog({ title: "Error", message: "Failed to save draft.", type: "error" });
    }
  };

  const handleGenerateClick = (action) => {
    if (!validateForm()) return;
    confirmGenerate(action);
  };

  const confirmGenerate = async (action) => {
    const total = parseFloat(formData.totalAmount);
    
    // Receipt generated fully
    let paid = total;
    let remaining = 0;
    
    const parts = formData.receiptNo.split("/");
    if (parts.length >= 3) {
      localStorage.setItem("lastReceiptNumber", parts[2]);
    }

    const finalReceipt = {
      ...formData,
      status: "Completed",
      siteId: formData.siteId ? formData.siteId.toString() : "",
      totalAmount: parseFloat(formData.totalAmount) || 0,
      amountPaid: paid,
      remainingAmount: remaining
    };

    try {
      const res = await fetch('/api/finance/receipts', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalReceipt)
      });
      if (res.ok) {
        const saved = await res.json();
        const storedReceipt = {...finalReceipt, id: saved.id};
        setReceipts([storedReceipt, ...receipts]);
        setIsModalOpen(false);
        
        if (action === "print") {
          setPrintData([storedReceipt]);
          setTimeout(() => {
            handlePrintAction();
          }, 100);
        } else {
          showDialog({ title: "Generated", message: "Receipt generated successfully.", type: "success" });
        }
        resetForm();
      }
    } catch(err) {
      console.error(err);
      showDialog({ title: "Error", message: "Failed to generate receipt.", type: "error" });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      receiptNo: getNewReceiptNumber(),
      date: new Date().toISOString().split("T")[0],
      totalAmount: "",
      category: "Advance Payment",
      comments: "",
      paymentMode: "Cash"
    }));
  };

  const deleteReceipt = (id) => {
    showDialog({
      title: "Delete Receipt",
      message: "Are you sure you want to delete this receipt?",
      type: "confirm",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/finance/receipts/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            setReceipts(receipts.filter(r => r.id !== id));
            showDialog({ title: "Deleted", message: "Receipt deleted successfully.", type: "success" });
          }
        } catch(err) {
          console.error(err);
          showDialog({ title: "Error", message: "Failed to delete receipt.", type: "error" });
        }
      }
    });
  };

  const printPastReceipt = (receipt) => {
    if (receipt.status === "Draft") {
       showDialog({ title: "Cannot Print", message: "Drafts cannot be printed. Please generate the receipt first.", type: "alert" });
       return;
    }
    setPrintData([receipt]);
    setTimeout(() => {
      handlePrintAction();
    }, 100);
  };

  const printSelectedReceipts = () => {
    const toPrint = receipts.filter(r => selectedReceipts.includes(r.id) && r.status !== "Draft");
    if (toPrint.length === 0) {
      showDialog({ title: "No Valid Receipts", message: "Please select completed receipts to print.", type: "alert" });
      return;
    }
    setPrintData(toPrint);
    setTimeout(() => {
      handlePrintAction();
    }, 100);
  };

  const toggleSelectReceipt = (id) => {
    setSelectedReceipts(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Completed": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "Partial": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "Pending": return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "Draft": return "bg-slate-700/30 text-slate-300 border-slate-600/30";
      default: return "bg-slate-700/30 text-slate-300 border-slate-600/30";
    }
  };

  const filteredReceipts = receipts.filter(r => 
    (historyFilter === "All" || r.status === historyFilter) &&
    (!selectedSiteId || r.siteId === selectedSiteId.toString() || r.siteId === selectedSiteId) &&
    (r.receiptNo.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
     (r.description && r.description.toLowerCase().includes(historySearchTerm.toLowerCase())))
  );

  const renderReceipt = (data) => (
    <div key={data.id || data.receiptNo} className="p-10 bg-white text-slate-900 font-sans border-b-2 border-gray-400 h-[142mm] flex flex-col mx-auto w-[210mm] relative box-border">
      <div className="flex justify-between border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-lg" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Mona Interior Studio</h1>
            <p className="font-bold text-gray-600 text-sm">Official Payment Receipt</p>
            <div className="mt-2">
               <span className="px-2 py-0.5 rounded border border-gray-600 text-[10px] font-black uppercase tracking-widest text-gray-800">
                 Status: {data.status}
               </span>
            </div>
          </div>
        </div>
        <div className="text-right mt-6">
          <h2 className="text-xl font-black text-gray-900"># {data.receiptNo}</h2>
          <p className="font-bold mt-1 text-sm text-gray-700">Date: {new Date(data.date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden mt-4">
        <div className="grid grid-cols-3 border-b border-gray-300">
          <div className="p-3 bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 border-r border-gray-300 flex items-center">Received From</div>
          <div className="p-3 col-span-2 font-black text-gray-900">{data.clientName}</div>
        </div>
        <div className="grid grid-cols-3 border-b border-gray-300">
          <div className="p-3 bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 border-r border-gray-300 flex items-center">Amount Received</div>
          <div className="p-3 col-span-2 font-black text-gray-900 text-xl tracking-tight">₹ {parseFloat(data.amountPaid || data.totalAmount || 0).toLocaleString()}</div>
        </div>
        <div className="grid grid-cols-3 border-b border-gray-300">
          <div className="p-3 bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 border-r border-gray-300 flex items-center">Payment Mode</div>
          <div className="p-3 col-span-2 font-bold text-gray-900">{data.paymentMode}</div>
        </div>
        <div className="grid grid-cols-3 border-b border-gray-300">
          <div className="p-3 bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 border-r border-gray-300 flex items-center">Towards</div>
          <div className="p-3 col-span-2 font-bold text-gray-900">{data.category} {data.description ? `— ${data.description}` : ''}</div>
        </div>
        {data.comments && (
          <div className="grid grid-cols-3">
            <div className="p-3 bg-gray-50 text-xs font-bold uppercase tracking-widest text-gray-600 border-r border-gray-300 flex items-center">Remarks</div>
            <div className="p-3 col-span-2 text-sm text-gray-800 italic">{data.comments}</div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-300 text-center">
        <p className="text-[10px] text-gray-500 italic font-medium">This is a computer generated document and does not require a physical signature.</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 page-wrapper h-full flex flex-col font-sans relative">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <Receipt className="text-blue-500" size={18} />
            Payment Receipts
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">Manage payments per work order.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* LEFT PANEL: WORK ORDERS LIST (VERTICAL TAB) */}
        <div className="xl:col-span-4 h-[calc(100vh-160px)] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border-color)]">
            <div className="relative w-full shadow-sm rounded-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input type="text" placeholder="Search Work Orders..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] themed-input text-sm outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {sites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.clientName.toLowerCase().includes(searchTerm.toLowerCase())).map(site => (
                <button key={site.id} onClick={() => setSelectedSiteId(site.id)} className={`w-full text-left p-4 rounded-2xl transition border ${selectedSiteId === site.id ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 shadow-sm" : "themed-card border-[var(--border-color)]"}`}>
                  <h3 className="font-black text-themed text-sm mb-1">#{site.id} - {site.name}</h3>
                  <div className="text-[10px] text-muted flex flex-col gap-1">
                    <span className="flex items-center gap-1"><User size={10}/> {site.clientName}</span>
                    <span className="flex items-center gap-1"><MapPin size={10}/> {site.address}</span>
                  </div>
                </button>
             ))}
          </div>
        </div>

        {/* RIGHT PANEL: RECEIPTS FOR SELECTED WORK ORDER */}
        <div className="xl:col-span-8 h-[calc(100vh-160px)] flex flex-col overflow-hidden">
           {selectedSiteId ? (
              <div className="h-full flex flex-col">
                 <div className="flex justify-between items-center mb-4 shrink-0 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-color)]">
                    <div className="flex gap-2">
                      <button onClick={() => setShowHistory(false)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${!showHistory ? "btn-accent shadow-md" : "text-muted hover:bg-white/5"}`}>New Receipt</button>
                      <button onClick={() => setShowHistory(true)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${showHistory ? "btn-accent shadow-md" : "text-muted hover:bg-white/5"}`}>History</button>
                    </div>
                 </div>

                 {!showHistory ? (
                   // New Receipt Form
                   <div className="themed-card shadow-sm rounded-3xl overflow-hidden p-4 flex-1 border border-[var(--border-color)] flex flex-col">
                     <h2 className="text-lg font-black mb-2 flex items-center gap-2">
                       <Receipt size={18} className="text-[var(--accent)]"/> New Payment Receipt
                     </h2>
                     <form className="flex flex-col justify-between">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt No</label>
                           <input readOnly value={formData.receiptNo} className="w-full py-1.5 px-3 themed-input rounded-xl text-sm font-bold outline-none cursor-not-allowed opacity-60" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                           <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full py-1.5 px-3 border border-[var(--border-color)] themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Name *</label>
                           <input required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. John Doe" className="w-full py-1.5 px-3 border border-[var(--border-color)] themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received (₹) *</label>
                           <input required type="text" inputMode="decimal" pattern="^\d*\.?\d*$" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} placeholder="0.00" className="w-full py-1.5 px-3 border border-[var(--border-color)] rounded-xl text-sm font-black text-emerald-500 themed-input outline-none focus:border-emerald-500" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</label>
                           <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full py-1.5 px-3 border border-[var(--border-color)] themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500">
                             <option>Advance Payment</option>
                             <option>Partial Payment</option>
                             <option>Closing Payment</option>
                             <option>Security Deposit</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Mode</label>
                           <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})} className="w-full py-1.5 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500">
                             <option>Cash</option>
                             <option>UPI / Online</option>
                             <option>Cheque</option>
                             <option>Bank Transfer</option>
                           </select>
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description *</label>
                           <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Master Bedroom Work" className="w-full py-1.5 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comments (Optional)</label>
                           <textarea value={formData.comments} rows={1} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Any additional details..." className="w-full py-1.5 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                         </div>
                       </div>
                       
                       <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-[var(--border-color)] shrink-0">
                         <div className="flex flex-wrap md:flex-nowrap gap-3">
                           <button type="button" onClick={saveAsDraft} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-muted hover:bg-[var(--bg-card-hover)] py-2.5 rounded-xl font-black uppercase tracking-widest transition flex justify-center items-center gap-2 text-xs">
                              <Save size={16}/> Save Draft
                           </button>
                           <button type="button" onClick={() => handleGenerateClick('generate')} className="flex-1 btn-accent py-2.5 rounded-xl font-black uppercase tracking-widest transition flex justify-center items-center gap-2 text-xs">
                              <CheckCircle2 size={16}/> Generate
                           </button>
                           <button type="button" onClick={() => handleGenerateClick('print')} className="flex-1 btn-accent py-2.5 rounded-xl font-black uppercase tracking-widest transition flex justify-center items-center gap-2 text-xs">
                              <Printer size={16}/> Generate & Print
                           </button>
                         </div>
                       </div>
                     </form>
                   </div>
                 ) : (
                   // History Table
                   <div className="themed-card shadow-sm rounded-3xl overflow-hidden flex flex-col flex-1 border border-[var(--border-color)]">
                     <div className="p-3 border-b border-[var(--border-color)] flex flex-wrap justify-between items-center gap-2 bg-[var(--bg-surface)] shrink-0 custom-scrollbar">
                       <div className="flex gap-2 overflow-x-auto">
                         {['All', 'Completed', 'Draft'].map(filter => (
                           <button
                             key={filter}
                             onClick={() => setHistoryFilter(filter)}
                             className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${historyFilter === filter ? 'btn-accent' : 'themed-card text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                           >
                             {filter}
                           </button>
                         ))}
                         {selectedReceipts.length > 0 && (
                           <button onClick={printSelectedReceipts} className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition btn-accent shadow flex items-center gap-2">
                             <Printer size={12}/> Print Selected ({selectedReceipts.length})
                           </button>
                         )}
                       </div>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                         <input 
                           type="text" 
                           placeholder="Search Receipts..." 
                           value={historySearchTerm}
                           onChange={(e) => setHistorySearchTerm(e.target.value)}
                           className="w-full sm:w-48 lg:w-64 pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] themed-input text-xs font-bold outline-none transition-all" 
                         />
                       </div>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                       <table className="w-full text-left text-xs">
                         <thead>
                           <tr className="text-[9px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)] themed-thead sticky top-0 shadow-sm z-10">
                             <th className="px-4 py-3 w-8"></th>
                             <th className="px-4 py-3">Receipt No</th>
                             <th className="px-4 py-3">Status</th>
                             <th className="px-4 py-3 text-right">Amount Received</th>
                             <th className="px-4 py-3 text-right">Actions</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y themed-divider">
                           {filteredReceipts.map((r) => (
                             <tr key={r.id} className="themed-row">
                               <td className="px-4 py-3">
                                 <input type="checkbox" checked={selectedReceipts.includes(r.id)} onChange={() => toggleSelectReceipt(r.id)} className="rounded border-gray-400 cursor-pointer" />
                               </td>
                               <td className="px-4 py-3">
                                 <div className="font-bold text-themed">{r.receiptNo}</div>
                                 <div className="text-[9px] text-muted">{new Date(r.date).toLocaleDateString('en-IN')}</div>
                               </td>
                               <td className="px-4 py-3">
                                 <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getStatusColor(r.status)}`}>
                                   {r.status}
                                 </span>
                               </td>
                               <td className="px-4 py-3 text-right font-black text-emerald-500">₹{parseFloat(r.amountPaid || r.totalAmount || 0).toLocaleString()}</td>
                               <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button onClick={() => printPastReceipt(r)} className={`font-bold text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg transition ${r.status === 'Draft' ? 'bg-[var(--accent-soft)] text-muted cursor-not-allowed opacity-50' : 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20'}`}>Print</button>
                                    <button onClick={() => deleteReceipt(r.id)} className="text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"><Trash2 size={14}/></button>
                                  </div>
                               </td>
                             </tr>
                           ))}
                           {filteredReceipts.length === 0 && (
                             <tr><td colSpan="4" className="py-20 text-center text-slate-300 font-bold uppercase text-xs">No receipts found for this project</td></tr>
                           )}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
              </div>
           ) : (
              <div className="h-full border-2 border-dashed border-[var(--border-color)] rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-[var(--bg-surface)]">
                <Building size={64} className="mb-4 text-slate-300" />
                <p className="font-bold text-lg uppercase tracking-widest">Select a Work Order</p>
                <p className="text-sm font-medium mt-2">Generate and view payment receipts per project.</p>
              </div>
           )}
        </div>
      </div>

      {/* Hidden Print Content */}
      <div style={{ display: 'none' }}>
        {printData.length > 0 && (
          <div ref={componentRef} className="bg-white print-container">
            {printData.map((data, idx) => (
              <React.Fragment key={data.id || idx}>
                {renderReceipt(data)}
                {idx % 2 === 0 && idx !== printData.length - 1 && (
                  <div className="w-[210mm] mx-auto flex items-center justify-center relative overflow-hidden py-1 opacity-60">
                    <div className="w-full border-t border-dashed border-gray-500"></div>
                    <span className="absolute bg-white px-2 text-[10px] uppercase tracking-widest font-black text-gray-500">✂ Cut Here</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
