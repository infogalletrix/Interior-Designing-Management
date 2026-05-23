import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { useLocation } from "react-router-dom";
import { Receipt, Printer, History, User, Calendar, IndianRupee, Trash2, Save, ArrowLeft, Building, X, CheckCircle2 } from "lucide-react";
import { useDialog } from "../contexts/DialogContext";
import SearchableSelect from "../components/SearchableSelect";

export default function ReceiptPage() {
  const { showDialog } = useDialog();
  const location = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [sites, setSites] = useState([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateAction, setGenerateAction] = useState(null); // 'generate' or 'print'
  const [paymentStatus, setPaymentStatus] = useState("Complete");
  const [partialAmount, setPartialAmount] = useState("");

  const [receipts, setReceipts] = useState([]);

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

  const [printData, setPrintData] = useState(null);

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
      const { name, desc, siteId, organizationName } = location.state.autoFill;
      setFormData(prev => ({ 
        ...prev, 
        siteId: siteId || "",
        clientName: organizationName || name || "", 
        description: desc || ""
      }));
      setShowHistory(false);
    }
  }, [location.state]);

  const componentRef = useRef();
  const handlePrintAction = useReactToPrint({ contentRef: componentRef });

  const handleSiteChange = async (e) => {
    const selectedSiteId = e.target.value;
    const site = sites.find(s => s.id.toString() === selectedSiteId);
    
    // Prefer organizationName if it exists, otherwise fallback to clientName
    let clientNm = site ? (site.organizationName || site.clientName) : "";
    let desc = site ? site.name : "";

    setFormData(prev => ({
      ...prev,
      siteId: selectedSiteId,
      clientName: clientNm,
      description: desc
    }));
  };

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
      remainingAmount: parseFloat(formData.totalAmount)
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
    setGenerateAction(action);
    setPaymentStatus("Complete");
    setPartialAmount("");
    setIsModalOpen(true);
  };

  const confirmGenerate = async () => {
    const total = parseFloat(formData.totalAmount);
    let paid = 0;
    
    if (paymentStatus === "Complete") {
      paid = total;
    } else if (paymentStatus === "Partial") {
      paid = parseFloat(partialAmount);
      if (isNaN(paid) || paid <= 0 || paid > total) {
        showDialog({ title: "Invalid Amount", message: "Please enter a valid partial amount.", type: "error" });
        return;
      }
    } else if (paymentStatus === "Pending") {
      paid = 0;
    }

    const remaining = total - paid;
    
    const parts = formData.receiptNo.split("/");
    if (parts.length >= 3) {
      localStorage.setItem("lastReceiptNumber", parts[2]);
    }

    const finalReceipt = {
      ...formData,
      status: paymentStatus === "Complete" ? "Completed" : paymentStatus,
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
        
        if (generateAction === "print") {
          setPrintData(storedReceipt);
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
    setFormData({
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
    setPrintData(receipt);
    setTimeout(() => {
      handlePrintAction();
    }, 100);
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

  const filteredReceipts = receipts.filter(r => historyFilter === "All" || r.status === historyFilter);

  return (
    <div className="p-4 md:p-6 page-wrapper flex-1 h-full overflow-hidden flex flex-col font-sans relative">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <Receipt className="text-blue-500" size={18} />
            Payment Receipts
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">Generate and track customer payment receipts.</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`${
            showHistory
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)] text-themed hover:bg-[var(--bg-card-hover)]'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          } px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition text-sm`}
        >
          {showHistory ? <><ArrowLeft size={16} /> Generate Receipt</> : <><History size={16} /> View History</>}
        </button>
      </div>

      {!showHistory ? (
        <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden p-5 max-w-5xl mx-auto flex-1 flex flex-col w-full relative">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 shrink-0">
            <Receipt size={20} className="text-blue-600"/> New Payment Receipt
          </h2>
          <form className="flex-1 flex flex-col justify-between overflow-hidden pr-2 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[var(--accent-soft)] p-3 rounded-2xl border border-[var(--border-color)] col-span-1 md:col-span-3 flex gap-3 items-center">
                 <Building className="text-[var(--accent)] shrink-0" size={24}/>
                 <div className="flex-1">
                   <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mb-1">Select Work Order *</label>
                   <SearchableSelect
                     value={formData.siteId}
                     onChange={handleSiteChange}
                     options={sites.map(site => ({ value: site.id, label: `${site.name} (Client: ${site.clientName})` }))}
                     placeholder="-- Select a Work Order --"
                     className="w-full py-2 px-3 border-2 border-[var(--border-color)] rounded-xl text-sm font-bold themed-input focus:border-blue-500"
                   />
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt No</label>
                <input readOnly value={formData.receiptNo} className="w-full py-2 px-3 themed-input rounded-xl text-sm font-bold outline-none cursor-not-allowed opacity-60" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full py-2 px-3 border border-[var(--border-color)] themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Name *</label>
                <input required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. John Doe" className="w-full py-2 px-3 themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount Due (₹) *</label>
                <input required type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} placeholder="0.00" className="w-full py-2 px-3 border border-[var(--border-color)] rounded-xl text-sm font-black text-emerald-500 themed-input outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full py-2 px-3 border border-[var(--border-color)] themed-input rounded-xl text-sm font-bold outline-none focus:border-blue-500">
                  <option>Advance Payment</option>
                  <option>Partial Payment</option>
                  <option>Closing Payment</option>
                  <option>Security Deposit</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Mode</label>
                <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})} className="w-full py-2 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500">
                  <option>Cash</option>
                  <option>UPI / Online</option>
                  <option>Cheque</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description *</label>
                <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Master Bedroom Work" className="w-full py-2 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comments (Optional)</label>
                <input value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Any additional details..." className="w-full py-2 px-3 themed-input border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              </div>
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap gap-3 mt-4 pt-4 border-t border-[var(--border-color)] shrink-0">
              <button type="button" onClick={saveAsDraft} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-muted hover:bg-[var(--bg-card-hover)] py-3 rounded-xl font-black uppercase tracking-widest transition flex justify-center items-center gap-2 text-xs">
                 <Save size={16}/> Save Draft
              </button>
              <button type="button" onClick={() => handleGenerateClick('generate')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black uppercase tracking-widest transition flex justify-center items-center gap-2 text-xs">
                 <CheckCircle2 size={16}/> Generate
              </button>
              <button type="button" onClick={() => handleGenerateClick('print')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition flex justify-center items-center gap-2 text-xs">
                 <Printer size={16}/> Generate & Print
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto bg-[var(--bg-surface)] shrink-0 scrollbar-hide">
            {["All", "Completed", "Partial", "Pending", "Draft"].map(filter => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${
                  historyFilter === filter ? "btn-accent" : "themed-card text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)] themed-thead sticky top-0 shadow-sm z-10">
                  <th className="px-6 py-4">Receipt No & Date</th>
                  <th className="px-6 py-4">Client Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total Due</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-divider">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="themed-row">
                    <td className="px-6 py-4">
                      <div className="font-bold text-themed">{r.receiptNo}</div>
                      <div className="text-xs text-muted">{new Date(r.date).toLocaleDateString("en-IN")}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-themed">{r.clientName}</div>
                      <div className="text-[10px] text-muted uppercase font-black">{r.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[var(--text-secondary)]">₹{parseFloat(r.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-500">₹{parseFloat(r.amountPaid || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-500">₹{parseFloat(r.remainingAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                         <button onClick={() => printPastReceipt(r)} className={`font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition ${r.status === 'Draft' ? 'bg-[var(--accent-soft)] text-muted cursor-not-allowed opacity-50' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'}`}>Print</button>
                         <button onClick={() => deleteReceipt(r.id)} className="text-rose-500 hover:text-rose-400 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"><Trash2 size={16}/></button>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && (
                  <tr><td colSpan="7" className="py-20 text-center text-slate-300 font-bold uppercase text-xs">No receipts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="themed-modal rounded-[32px] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-themed">Payment Status</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-themed bg-[var(--bg-card)] p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Total Amount Due</label>
                <div className="text-3xl font-black text-themed">₹{parseFloat(formData.totalAmount).toLocaleString()}</div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Select Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Complete", "Partial", "Pending"].map(status => (
                    <button
                      key={status}
                      onClick={() => setPaymentStatus(status)}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition ${
                        paymentStatus === status ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "themed-card text-muted border-[var(--border-color)]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {paymentStatus === "Partial" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Partial Amount Received (₹)</label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full py-3 px-4 border-2 border-amber-500/40 bg-amber-500/10 rounded-xl text-lg font-black text-amber-400 outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <button 
              onClick={confirmGenerate} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition active:scale-95"
            >
              Confirm & {generateAction === "print" ? "Print" : "Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Hidden Print Content */}
      <div style={{ display: "none" }}>
        {printData && (
          <div ref={componentRef} className="p-16 bg-white text-slate-900 font-sans border-[12px] border-slate-100 min-h-[500px]">
            <div className="flex justify-between border-b-2 border-slate-900 pb-8 mb-10">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Mona Interior Studio</h1>
                <p className="font-bold text-slate-500">Official Payment Receipt</p>
                <div className="mt-4">
                   <span className={`px-3 py-1 rounded border text-xs font-black uppercase tracking-widest ${getStatusColor(printData.status)}`}>
                     Status: {printData.status}
                   </span>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-black text-slate-200"># {printData.receiptNo}</h2>
                <p className="font-bold mt-2">Date: {new Date(printData.date).toLocaleDateString("en-IN")}</p>
              </div>
            </div>
            
            <div className="space-y-8 text-lg">
              <p>Received with thanks from <span className="font-black border-b-2 border-slate-200 px-4 inline-block min-w-[200px]">{printData.clientName}</span></p>
              <p>the sum of Rupees <span className="font-black border-b-2 border-slate-200 px-4 inline-block min-w-[150px]">₹ {parseFloat(printData.amountPaid || 0).toLocaleString()}</span></p>
              <p>by <span className="font-black border-b-2 border-slate-200 px-4 inline-block">{printData.paymentMode}</span></p>
              <p>towards <span className="font-black border-b-2 border-slate-200 px-4 inline-block">{printData.category} {printData.description ? `(${printData.description})` : ""}</span></p>
              {printData.comments && <p className="text-sm text-slate-500 italic">Note: {printData.comments}</p>}
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 border-y-2 border-dashed border-slate-200 py-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Amount Due</p>
                <p className="text-xl font-black">₹ {parseFloat(printData.totalAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Amount Received</p>
                <p className="text-xl font-black text-emerald-600">₹ {parseFloat(printData.amountPaid || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-500 uppercase">Remaining Balance</p>
                <p className="text-xl font-black text-rose-500">₹ {parseFloat(printData.remainingAmount || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end items-end mt-24">
              <div className="text-center">
                 <div className="w-48 border-t-2 border-slate-900 mb-2"></div>
                 <p className="font-black uppercase tracking-widest text-xs">Authorized Signatory</p>
                 <p className="text-[10px] text-slate-400">Mona Interior Studio</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
