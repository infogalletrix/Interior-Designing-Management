import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintableInvoice from "../components/PrintableInvoice";
import PrintableQuotation from "../components/PrintableQuotation";
import {
  FileText, Search, Eye, Printer, CheckCircle2, Clock, AlertCircle,
  IndianRupee, TrendingUp, Calendar, X, Filter, Edit2, Trash2,
  History, FileCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDialog } from "../contexts/DialogContext";

// Removed getStatusInfo for invoices as requested

function getQuoteStatus(q) {
  const s = q.status || "Pending";
  if (s === "Approved") return { label: "Approved", color: "emerald", icon: CheckCircle2 };
  if (s === "Rejected") return { label: "Rejected", color: "red", icon: AlertCircle };
  if (s === "Negotiating") return { label: "Negotiating", color: "blue", icon: Clock };
  return { label: "Pending", color: "amber", icon: Clock };
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showDialog } = useDialog();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "invoices");
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const componentRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/finance/invoices");
      const data = await res.json();
      const mapped = data.map((inv) => {
        const itemsData = inv.items || {};
        return {
          ...inv,
          items: itemsData.itemsList || itemsData,
          discount: itemsData.discount || 0,
          lessAmount: itemsData.lessAmount || 0,
          advanceAmount: itemsData.advanceAmount || 0,
          receivedAmount: itemsData.receivedAmount || 0,
          subTotal: itemsData.subTotal || 0,
          totalGst: itemsData.totalGst || 0,
          grandTotal: itemsData.grandTotal || inv.total || 0,
          balanceAmount: itemsData.balanceAmount || 0,
          invoiceDate: inv.date,
          organizationName: inv.organizationName || itemsData.organizationName || "",
          gstNumber: inv.gstNumber || itemsData.gstNumber || "",
          workOrderId: itemsData.workOrderId || "",
        };
      });
      setSavedInvoices(mapped);
    } catch (err) { console.error(err); }
  };

  const fetchQuotations = async () => {
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const updateQuotationStatus = async (q, newStatus) => {
    try {
      await fetch(`/api/quotations/${q.id || q.quoteNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...q, status: newStatus })
      });
      fetchQuotations();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchQuotations();
  }, []);

  const deleteInvoice = async (id) => {
    showDialog({
      title: "Delete Invoice",
      message: "Delete this invoice permanently?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/finance/invoices/${id}`, { method: "DELETE" });
          fetchInvoices();
        } catch (err) { console.error(err); }
      }
    });
  };

  const deleteQuotation = async (id) => {
    showDialog({
      title: "Delete Quotation",
      message: "Delete this quotation permanently?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`/api/quotations/${id}`, { method: "DELETE" });
          fetchQuotations();
        } catch (err) { console.error(err); }
      }
    });
  };

  const filteredInvoices = savedInvoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const match = inv.clientName?.toLowerCase().includes(q) || inv.invoiceNo?.toLowerCase().includes(q);
    return match;
  });

  const filteredQuotations = quotations.filter((q) => {
    const s = searchTerm.toLowerCase();
    return q.clientName?.toLowerCase().includes(s) || q.quoteNo?.toLowerCase().includes(s);
  });

  const totalInvoiced = savedInvoices.reduce((s, i) => s + parseFloat(i.grandTotal || 0), 0);
  const totalCollected = savedInvoices.reduce((s, i) => s + parseFloat(i.advanceAmount || 0) + parseFloat(i.receivedAmount || 0), 0);
  const totalOutstanding = savedInvoices.reduce((s, i) => s + Math.max(0, parseFloat(i.balanceAmount || 0)), 0);

  return (
    <div className="p-4 md:p-6 page-wrapper">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black text-themed flex items-center gap-2">
            <History className="text-[#C9A227]" size={18} /> Transaction History
          </h1>
          <p className="text-muted text-xs mt-0.5 font-medium">All invoices and quotations in one place.</p>
        </div>
        {/* Tab Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("invoices"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${
              activeTab === "invoices"
                ? "bg-[#C9A227] text-white shadow-md"
                : "bg-white/5 text-muted border border-[var(--border-color)] hover:bg-white/10"
            }`}
          >
            <FileText size={16} /> Invoices
          </button>
          <button
            onClick={() => { setActiveTab("quotations"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${
              activeTab === "quotations"
                ? "bg-amber-500 text-white shadow-amber-200 shadow-md"
                : "bg-white/5 text-muted border border-[var(--border-color)] hover:bg-white/10"
            }`}
          >
            <FileCheck size={16} /> Quotations
          </button>
        </div>
      </div>

      {/* ── INVOICES TAB ── */}
      {activeTab === "invoices" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <div className="themed-card p-7 rounded-3xl shadow-xl">
              <p className="text-muted text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <IndianRupee size={12} /> Total Invoiced
              </p>
              <h2 className="text-4xl font-black tracking-tighter text-themed">₹{totalInvoiced.toLocaleString()}</h2>
              <p className="text-muted text-xs mt-2 font-medium">{savedInvoices.length} invoice{savedInvoices.length !== 1 ? "s" : ""} total</p>
            </div>
            <div className="themed-card p-7 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Amount Collected</p>
                <h2 className="text-3xl font-black text-emerald-600">₹{totalCollected.toLocaleString()}</h2>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-3xl text-emerald-500"><TrendingUp size={28} /></div>
            </div>
          </div>

          <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-1">
                {/* Status filters removed */}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="text" placeholder="Search by client or invoice no..."
                  className="pl-9 pr-4 py-2.5 themed-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium w-72"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-[var(--border-color)] themed-thead">
                    <th className="px-8 py-4">Invoice No.</th>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Client</th>
                    <th className="px-8 py-4 text-right">Grand Total</th>
                    <th className="px-8 py-4 text-right">Collected</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y themed-divider">
                  {filteredInvoices.map((inv) => {
                    const collected = parseFloat(inv.advanceAmount || 0) + parseFloat(inv.receivedAmount || 0);
                    return (
                      <tr key={inv.invoiceNo} className="themed-row">
                        <td className="px-8 py-5"><span className="font-black text-blue-500 text-sm">{inv.invoiceNo}</span></td>
                        <td className="px-8 py-5 text-sm text-muted font-medium">
                          <span className="flex items-center gap-2"><Calendar size={13} className="text-muted" />{inv.invoiceDate}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-black text-themed text-sm">{inv.clientName}</p>
                          <p className="text-xs text-muted font-medium mt-0.5">{inv.clientAddress}</p>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-themed text-base">₹{parseFloat(inv.grandTotal).toLocaleString()}</td>
                        <td className="px-8 py-5 text-right font-bold text-emerald-600">₹{collected.toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate("/billing", { state: { editInvoice: inv } })} className="p-2 bg-violet-500/10 text-violet-500 rounded-xl hover:bg-violet-500/20 transition" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => setPreviewInvoice(inv)} className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl hover:bg-[var(--accent)]/20 transition" title="Preview"><Eye size={16} /></button>
                            <button onClick={() => { setPreviewInvoice(inv); setTimeout(() => handlePrint(), 400); }} className="p-2 bg-teal-500/10 text-teal-500 rounded-xl hover:bg-teal-500/20 transition" title="Print"><Printer size={16} /></button>
                            <button onClick={() => deleteInvoice(inv.id)} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredInvoices.length === 0 && (
              <div className="py-20 text-center">
                <Filter className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                  {savedInvoices.length === 0 ? "No invoices yet. Generate from the Billing page." : "No invoices match your search."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── QUOTATIONS TAB ── */}
      {activeTab === "quotations" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            <div className="bg-amber-600 text-white p-7 rounded-3xl shadow-xl">
              <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Quotations</p>
              <h2 className="text-4xl font-black tracking-tighter">{quotations.length}</h2>
              <p className="text-amber-300 text-xs mt-2 font-medium">All time</p>
            </div>
            <div className="themed-card p-7 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Total Value</p>
                <h2 className="text-3xl font-black text-amber-600">₹{quotations.reduce((s, q) => s + parseFloat(q.total || 0), 0).toLocaleString()}</h2>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-3xl text-amber-500"><FileCheck size={28} /></div>
            </div>
            <div className="themed-card p-7 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Pending/Negotiating</p>
                <h2 className="text-3xl font-black text-themed">{quotations.filter(q => (q.status || "Pending") === "Pending" || q.status === "Negotiating").length}</h2>
              </div>
              <div className="p-4 bg-[var(--accent-soft)] rounded-3xl text-muted"><Clock size={28} /></div>
            </div>
          </div>

          <div className="themed-card shadow-2xl rounded-[32px] overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="text" placeholder="Search by client or quote no..."
                  className="pl-9 pr-4 py-2.5 themed-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 font-medium w-72"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/10 bg-black/20">
                    <th className="px-8 py-4">Quote No.</th>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Client</th>
                    <th className="px-8 py-4 text-right">Total</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y themed-divider">
                  {filteredQuotations.map((q) => {
                    const { label, color, icon: StatusIcon } = getQuoteStatus(q);
                    return (
                      <tr key={q.id || q.quoteNo} className="themed-row">
                        <td className="px-8 py-5"><span className="font-black text-amber-500 text-sm">{q.quoteNo}</span></td>
                        <td className="px-8 py-5 text-sm text-muted font-medium">
                          <span className="flex items-center gap-2"><Calendar size={13} className="text-muted" />{q.date}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-black text-themed text-sm">{q.clientName}</p>
                          <p className="text-xs text-muted font-medium mt-0.5">{q.clientAddress}</p>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-themed text-base">₹{parseFloat(q.total || 0).toLocaleString()}</td>
                        <td className="px-8 py-5 text-center">
                          <div className="relative inline-block w-full max-w-[120px]">
                            <select 
                              value={q.status || "Pending"}
                              onChange={(e) => updateQuotationStatus(q, e.target.value)}
                              className={`appearance-none w-full border border-transparent hover:border-${color}-200 cursor-pointer outline-none pl-8 pr-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 transition-colors`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Negotiating">Negotiating</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <StatusIcon size={10} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => navigate("/quotations", { state: { editQuote: q } })} className="p-2 bg-violet-500/10 text-violet-500 rounded-xl hover:bg-violet-500/20 transition" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => setPreviewInvoice(q)} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition" title="Preview"><Eye size={16} /></button>
                            <button onClick={() => { setPreviewInvoice(q); setTimeout(() => handlePrint(), 400); }} className="p-2 bg-teal-500/10 text-teal-500 rounded-xl hover:bg-teal-500/20 transition" title="Print"><Printer size={16} /></button>
                            <button onClick={() => deleteQuotation(q.id)} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredQuotations.length === 0 && (
              <div className="py-20 text-center">
                <Filter className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                  {quotations.length === 0 ? "No quotations yet. Generate from the Quotation page." : "No quotations match your search."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewInvoice && (() => {
        const isQuote = !!previewInvoice.quoteNo;
        const docTypeName = isQuote ? "Quotation" : "Invoice";
        const docNo = isQuote ? previewInvoice.quoteNo : previewInvoice.invoiceNo;
        const docDate = isQuote ? previewInvoice.date : previewInvoice.invoiceDate;

        let quoteSubTotal = 0;
        let quoteGst = 0;
        let quoteTotal = 0;
        if (isQuote) {
          quoteSubTotal = (previewInvoice.items || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
          quoteGst = previewInvoice.billType === "Non-GST" ? 0 : quoteSubTotal * 0.18;
          quoteTotal = quoteSubTotal + quoteGst;
        }

        const displaySubTotal = isQuote ? quoteSubTotal : parseFloat(previewInvoice.subTotal || 0);
        const displayGst = isQuote ? quoteGst : parseFloat(previewInvoice.totalGst || 0);
        const displayTotal = isQuote ? quoteTotal : parseFloat(previewInvoice.grandTotal || previewInvoice.total || 0);

        return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="themed-modal rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg">{docNo}</h3>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <span>{previewInvoice.billType === "GST" ? (previewInvoice.organizationName || "GST Invoice") : previewInvoice.clientName}</span>
                  {previewInvoice.workOrderId && (
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-bold">WO: {previewInvoice.workOrderId}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition"><Printer size={16} /> Print</button>
                <button onClick={() => setPreviewInvoice(null)} className="text-slate-400 hover:text-white transition p-2"><X size={24} /></button>
              </div>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                      {previewInvoice.billType === "GST" ? "Billed To (Org)" : "Client"}
                    </p>
                    {previewInvoice.billType !== "GST" && (
                      <p className="font-black text-themed mt-1">{previewInvoice.clientName}</p>
                    )}
                    {previewInvoice.organizationName && (
                      <p className="font-bold text-themed text-xs mt-0.5">{previewInvoice.organizationName}</p>
                    )}
                    {previewInvoice.billType === "GST" && previewInvoice.gstNumber && (
                      <p className="text-blue-600 font-mono text-[11px] font-semibold mt-0.5">GSTIN: {previewInvoice.gstNumber}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">{previewInvoice.clientAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{docTypeName} Date</p>
                    <p className="font-bold text-themed mt-1">{docDate}</p>
                  </div>
                </div>
                <table className="w-full text-sm border border-slate-100 rounded-2xl overflow-hidden mt-4">
                  <thead className="bg-white/5">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-4 py-3 text-left">Work</th>
                      <th className="px-4 py-3 text-center">Area</th>
                      <th className="px-4 py-3 text-right">{isQuote ? "Rate" : "Taxable"}</th>
                      {!isQuote && parseFloat(previewInvoice.totalGst || 0) > 0 && <th className="px-4 py-3 text-right">GST</th>}
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewInvoice.items?.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{isQuote ? item.description : item.work}</td>
                        <td className="px-4 py-3 text-center">{item.area} {item.unit}</td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(isQuote ? item.rate : (item.taxableAmount || 0)).toLocaleString()}</td>
                        {!isQuote && parseFloat(previewInvoice.totalGst || 0) > 0 && <td className="px-4 py-3 text-right text-blue-600">₹{parseFloat(item.gstAmount || 0).toLocaleString()}</td>}
                        <td className="px-4 py-3 text-right font-black">₹{parseFloat(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold">₹{displaySubTotal.toLocaleString()}</span></div>
                  {displayGst > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Total GST</span><span className="font-bold text-blue-600">₹{displayGst.toLocaleString()}</span></div>}
                  <div className="flex justify-between text-lg font-black border-t border-slate-200 pt-2 mt-2"><span>Grand Total</span><span className="text-emerald-600">₹{displayTotal.toLocaleString()}</span></div>
                  {!isQuote && (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Advance Paid</span><span className="font-bold">₹{parseFloat(previewInvoice.advanceAmount || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Received</span><span className="font-bold">₹{parseFloat(previewInvoice.receivedAmount || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-base font-black text-red-600 border-t border-slate-200 pt-2"><span>Balance Due</span><span>₹{Math.max(0, parseFloat(previewInvoice.balanceAmount || 0)).toLocaleString()}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {previewInvoice && (() => {
        const isQuote = !!previewInvoice.quoteNo;
        const docTypeName = isQuote ? "Quotation" : "Invoice";
        const docNo = isQuote ? previewInvoice.quoteNo : previewInvoice.invoiceNo;
        const docDate = isQuote ? previewInvoice.date : previewInvoice.invoiceDate;

        return (
        <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
          {isQuote ? (
            <PrintableQuotation ref={componentRef} data={{
              customer: previewInvoice.clientName, address: previewInvoice.clientAddress,
              projectTitle: previewInvoice.projectTitle, workDescription: previewInvoice.workDescription,
              items: previewInvoice.items || [], quoteNo: docNo, date: docDate, billType: previewInvoice.billType
            }} />
          ) : (
            <PrintableInvoice ref={componentRef} data={{
              customer: previewInvoice.clientName, address: previewInvoice.clientAddress,
              items: previewInvoice.items || [], invoiceNo: docNo,
              invoiceDate: docDate, discount: previewInvoice.discount,
              lessAmount: previewInvoice.lessAmount, advanceAmount: previewInvoice.advanceAmount,
              receivedAmount: previewInvoice.receivedAmount, subTotal: previewInvoice.subTotal,
              totalGst: previewInvoice.totalGst, grandTotal: previewInvoice.grandTotal || previewInvoice.total,
              balanceAmount: previewInvoice.balanceAmount,
              organizationName: previewInvoice.organizationName,
              gstNumber: previewInvoice.gstNumber,
              billType: previewInvoice.billType,
              workOrderId: previewInvoice.workOrderId,
            }} docType={docTypeName} />
          )}
        </div>
        );
      })()}
    </div>
  );
}
