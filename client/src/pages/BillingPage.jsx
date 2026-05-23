import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useLocation } from "react-router-dom";
import PrintableInvoice from "../components/PrintableInvoice";
import {
  Trash2,
  Printer,
  Save,
  RotateCcw,
  Search,
  History,
  X,
  Eye,
  Edit3,
  ArrowLeft,
  FileText,
  Plus,
  Edit,
} from "lucide-react";
import { useDialog } from "../contexts/DialogContext";

export default function BillingPage() {
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBadge, setEditBadge] = useState("");
  const [billType, setBillType] = useState("GST"); // 'GST' | 'Non-GST'
  const [items, setItems] = useState([]);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toLocaleDateString("en-GB"),
  );
  const [invoiceId, setInvoiceId] = useState("");

  // Footer fields
  const [discount, setDiscount] = useState(0);
  const [lessAmount, setLessAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);

  // Modal States
  const [showQuoteSearch, setShowQuoteSearch] = useState(false);
  const [showWorkOrderSearch, setShowWorkOrderSearch] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [savedInvoices, setSavedInvoices] = useState([]);

  const [newItem, setNewItem] = useState({
    work: "",
    unit: "Sq.Ft",
    area: "",
    price: "",
    gstPerc: 18,
  });

  // ── MULTI-SESSION LOGIC ──────────────────────────────────────
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("billing_sessions");
    return saved
      ? JSON.parse(saved)
      : [{ id: "default", title: "New Invoice", data: null }];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem("active_billing_session") || "default";
  });

  // Load session data when active session changes
  useEffect(() => {
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session && session.data) {
      const d = session.data;
      setItems(d.items || []);
      setClientName(d.clientName || "");
      setClientAddress(d.clientAddress || "");
      setProjectTitle(d.projectTitle || "");
      setWorkDescription(d.workDescription || "");
      setBillType(d.billType || "GST");
      setDiscount(d.discount || 0);
      setLessAmount(d.lessAmount || 0);
      setAdvanceAmount(d.advanceAmount || 0);
      setReceivedAmount(d.receivedAmount || 0);
      setEditBadge(d.editBadge || "");
      if (d.invoiceNo) setInvoiceNo(d.invoiceNo);
      setOrganizationName(d.organizationName || "");
      setGstNumber(d.gstNumber || "");
      setWorkOrderId(d.workOrderId || "");
      setInvoiceId(d.invoiceId || "");
    } else {
      // Clear for a new session if no data
      setItems([]);
      setClientName("");
      setClientAddress("");
      setBillType("GST");
      setDiscount(0);
      setLessAmount(0);
      setAdvanceAmount(0);
      setReceivedAmount(0);
      setIsEditMode(false);
      setEditBadge("");
      setInvoiceNo(""); // Number assigned by backend at save time — no pre-fetch
      setOrganizationName("");
      setGstNumber("");
      setInvoiceId("");
    }
    localStorage.setItem("active_billing_session", activeSessionId);
  }, [activeSessionId]);

  // Persist current state to sessions array
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
              ...s,
              title: clientName || "New Invoice",
              data: {
                items,
                clientName,
                clientAddress,
                projectTitle,
                workDescription,
                billType,
                discount,
                lessAmount,
                advanceAmount,
                receivedAmount,
                isEditMode,
                editBadge,
                invoiceNo,
                organizationName,
                gstNumber,
                invoiceId,
              },
            }
            : s,
        ),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [
    items,
    clientName,
    clientAddress,
    projectTitle,
    workDescription,
    billType,
    discount,
    lessAmount,
    advanceAmount,
    receivedAmount,
    isEditMode,
    editBadge,
    invoiceNo,
    activeSessionId,
    organizationName,
    gstNumber,
    invoiceId,
  ]);

  useEffect(() => {
    localStorage.setItem("billing_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: "New Invoice", data: null };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const closeSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      // Don't close the last session, just clear it
      setSessions([{ id: "default", title: "New Invoice", data: null }]);
      setActiveSessionId("default");
      setItems([]);
      setClientName("");
      setClientAddress("");
      setBillType("GST");
      setDiscount(0);
      setLessAmount(0);
      setAdvanceAmount(0);
      setReceivedAmount(0);
      setIsEditMode(false);
      setEditBadge("");
      setInvoiceId("");
      return;
    }
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[newSessions.length - 1].id);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        saveInvoice();
      }
      if (e.key === "F5") {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === "F8") {
        e.preventDefault();
        clearForm();
      }
      if (e.key === "F9") {
        e.preventDefault();
        navigate("/invoices");
      }
      if (e.key === "F1") {
        e.preventDefault();
        deleteInvoice();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, clientName, isEditMode]); // Add dependencies as needed

  // Load Data + handle incoming navigation state
  useEffect(() => {
    // ── Handle: Auto-fill from Work Order ────────────────────────
    if (location.state?.autoFill) {
      const { clientName, projectTitle, address, desc, organizationName, workOrderId } =
        location.state.autoFill;
      if (clientName) setClientName(clientName);
      if (address) setClientAddress(address);
      if (projectTitle) setProjectTitle(projectTitle);
      if (desc !== undefined) setWorkDescription(desc || "");
      if (organizationName) setOrganizationName(organizationName);
      if (workOrderId) setWorkOrderId(workOrderId);
    }

    // Fetch Quotations for 'FROM QUOTE' functionality
    const fetchQuotes = async () => {
      try {
        const res = await fetch("/api/quotations");
        const data = await res.json();
        setSavedQuotations(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuotes();

    // Fetch Work Orders
    const fetchWorkOrders = async () => {
      try {
        const res = await fetch("/api/sites");
        const data = await res.json();
        setWorkOrders(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkOrders();

    const fetchNextInvoiceNo = async () => {
      if (invoiceNo) return; 
      try {
        const res = await fetch("/api/finance/invoices/next-number");
        const data = await res.json();
        setInvoiceNo(data.nextNumber);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNextInvoiceNo();

    // ── Handle: Convert from Quotation ───────────────────────────
    if (location.state?.convertQuote) {
      const q = location.state.convertQuote;
      const isNonGST = q.billType === "Non-GST";
      if (isNonGST) setBillType("Non-GST");
      const mapped = q.items.map((i) => {
        const taxable = parseFloat(i.area || 1) * parseFloat(i.rate);
        const gst = isNonGST ? 0 : (taxable * 18) / 100;
        return {
          work: i.description,
          unit: i.unit || "Sq.Ft",
          area: i.area,
          price: i.rate,
          gstPerc: isNonGST ? 0 : 18,
          taxableAmount: taxable,
          gstAmount: gst,
          amount: taxable + gst,
          id: Date.now() + Math.random(),
        };
      });
      setItems(mapped);
      setEditBadge(
        `Converted from Quotation (${isNonGST ? "Non-GST" : "GST"}) — Review & save as Invoice`,
      );
      
      showDialog({
        title: "Work Order Required",
        message: "Quotation items imported. Please select a Work Order to attach to this invoice.",
        type: "alert"
      });
      
      // Clear the state so it doesn't trigger again on re-renders
      window.history.replaceState({}, document.title);
      return;
    }

    // ── Handle: Edit existing Invoice ─────────────────────────────
    if (location.state?.editInvoice) {
      const inv = location.state.editInvoice;
      setInvoiceNo(inv.invoiceNo);
      setClientName(inv.clientName);
      setClientAddress(inv.clientAddress || "");
      setProjectTitle(inv.projectTitle || "");
      setWorkDescription(inv.workDescription || "");
      setItems(inv.items || []);
      setDiscount(inv.discount || 0);
      setLessAmount(inv.lessAmount || 0);
      setAdvanceAmount(inv.advanceAmount || 0);
      setReceivedAmount(inv.receivedAmount || 0);
      setInvoiceDate(inv.invoiceDate || new Date().toLocaleDateString("en-GB"));
      setIsEditMode(true);
      setEditBadge(`Editing Invoice: ${inv.invoiceNo}`);
      setOrganizationName(inv.organizationName || inv.items?.organizationName || "");
      setGstNumber(inv.gstNumber || inv.items?.gstNumber || "");
      setWorkOrderId(inv.items?.workOrderId || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFromQuote = (quote) => {
    if (!clientName) {
      showDialog({
        title: "Work Order Required",
        message: "Please select a Work Order first before importing quotation items.",
        type: "alert"
      });
      return;
    }

    const isNonGST = quote.billType === "Non-GST";
    const type = isNonGST ? "Non-GST" : "GST";
    setBillType(type);
    
    const mappedItems = quote.items.map((i) => {
      const taxable = parseFloat(i.area || 1) * parseFloat(i.rate);
      const gst = isNonGST ? 0 : (taxable * 18) / 100;
      return {
        work: i.description,
        unit: i.unit || "Sq.Ft",
        area: i.area,
        price: i.rate,
        gstPerc: isNonGST ? 0 : 18,
        taxableAmount: taxable,
        gstAmount: gst,
        amount: taxable + gst,
        id: Date.now() + Math.random(),
      };
    });
    setItems(mappedItems);
    setShowQuoteSearch(false);
    
    // Fetch invoice number if blank
    if (!invoiceNo) {
      try {
        fetch("/api/finance/invoices/next-number")
          .then(res => res.json())
          .then(data => setInvoiceNo(data.nextNumber));
      } catch(e) {}
    }
  };

  const fetchFromWorkOrder = (wo) => {
    setClientName(wo.clientName);
    setClientAddress(wo.address || "");
    setProjectTitle(wo.name || "");
    setWorkDescription(wo.description || "");
    setOrganizationName(wo.organizationName || "");
    setWorkOrderId(wo.id || "");
    setShowWorkOrderSearch(false);

    // Fetch invoice number if blank
    if (!invoiceNo) {
      try {
        fetch("/api/finance/invoices/next-number")
          .then(res => res.json())
          .then(data => setInvoiceNo(data.nextNumber));
      } catch(e) {}
    }
  };

  const componentRef = useRef();
  const descRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: componentRef });

  const addItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newItem.price) return;
    const taxableAmount =
      parseFloat(newItem.area || 1) * parseFloat(newItem.price);
    const effectiveGST =
      billType === "Non-GST" ? 0 : parseFloat(newItem.gstPerc || 0);
    const gstAmount = (taxableAmount * effectiveGST) / 100;
    const totalAmount = taxableAmount + gstAmount;
    setItems([
      ...items,
      {
        ...newItem,
        gstPerc: effectiveGST,
        taxableAmount,
        gstAmount,
        amount: totalAmount,
        id: Date.now(),
      },
    ]);
    setNewItem({
      work: "",
      unit: "Sq.Ft",
      area: "",
      price: "",
      gstPerc: billType === "Non-GST" ? 0 : 18,
    });
    setTimeout(() => descRef.current?.focus(), 0);
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const editItem = (item) => {
    setNewItem(item);
    removeItem(item.id);
  };

  const subTotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalArea = items.reduce(
    (sum, item) => sum + parseFloat(item.area || 0),
    0,
  );

  const discountAmt = (subTotal * (parseFloat(discount) || 0)) / 100;
  const grandTotal =
    subTotal - discountAmt - (parseFloat(lessAmount) || 0) + totalGst;
  const balanceAmount =
    grandTotal -
    (parseFloat(advanceAmount) || 0) -
    (parseFloat(receivedAmount) || 0);

  useEffect(() => {
    if (!clientName) {
      setTotalReceipts(0);
      return;
    }
    const fetchReceipts = async () => {
      try {
        const res = await fetch('/api/finance/receipts');
        if (res.ok) {
          const savedReceipts = await res.json();
          const clientReceipts = savedReceipts.filter(r => r.clientName === clientName);
          const total = clientReceipts.reduce((sum, r) => sum + (parseFloat(r.amountPaid) || 0), 0);
          setTotalReceipts(total);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchReceipts();
  }, [clientName]);

  const isAmountMatched = grandTotal === totalReceipts;

  const triggerPrint = () => {
    if (!isAmountMatched && grandTotal > 0) {
      showDialog({
        title: "Print Disabled",
        message: `Payment receipts total (₹${totalReceipts}) does not match the final invoice amount (₹${grandTotal}). Please save as Draft.`,
        type: "alert"
      });
      return;
    }
    handlePrint();
  };

  const saveInvoice = async () => {
    if (!clientName || items.length === 0) {
      showDialog({ title: "Missing Information", message: "Please select a client and add at least one item.", type: "alert" });
      return;
    }

    // The backend handles the sequence number, but we can still save with the currently generated invoiceNo
    // (If duplicate occurs due to concurrency, backend can be updated to reject or auto-assign)

    const newInvoice = {
      id: invoiceId || (isEditMode ? location.state?.editInvoice?.id : `INV-${Date.now()}`),
      invoiceNo,
      invoiceDate,
      clientName,
      clientAddress,
      projectTitle,
      workDescription,
      organizationName,
      gstNumber,
      items: {
        itemsList: items,
        discount,
        lessAmount,
        advanceAmount,
        receivedAmount,
        balanceAmount,
        subTotal,
        totalGst,
        grandTotal,
        organizationName,
        gstNumber,
        workOrderId,
      },
      date: new Date().toISOString().split("T")[0], // For database
      total: grandTotal,
      billType,
      status: (isAmountMatched || grandTotal === 0) ? "Unpaid" : "Draft",
    };

    try {
      if (isEditMode || invoiceId) {
        await fetch(
          `/api/finance/invoices/${newInvoice.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newInvoice),
          },
        );
      } else {
        // Do NOT pass invoiceNo — backend generates it atomically at save time
        const payload = { ...newInvoice, invoiceNo: null };
        const res = await fetch("/api/finance/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const saved = await res.json();
        // Update displayed invoice number with backend-assigned value
        if (saved.invoiceNo) {
          setInvoiceNo(saved.invoiceNo);
          if (saved.id) {
            setInvoiceId(saved.id);
          }
          // Also patch the current session so the tab title / cached data stays correct
          setSessions(prev => prev.map(s => s.id === activeSessionId
            ? { ...s, data: s.data ? { ...s.data, invoiceNo: saved.invoiceNo, invoiceId: saved.id || invoiceId } : s.data }
            : s
          ));
        }
      }
      showDialog({
        title: "Success",
        message: (isEditMode || invoiceId) ? "Invoice Updated Successfully!" : "Invoice Saved Successfully!",
        type: "success"
      });
    } catch (err) {
      console.error(err);
      showDialog({ title: "Error", message: "An error occurred while saving.", type: "error" });
    }
  };

  const loadOldInvoice = (inv) => {
    // This function is kept for potential future use within the page, though it's typically loaded via router state.
    setInvoiceNo(inv.invoiceNo);
    setClientName(inv.clientName);
    setClientAddress(inv.clientAddress);
    setItems(inv.items?.itemsList || inv.items);
    setDiscount(inv.items?.discount || 0);
    setLessAmount(inv.items?.lessAmount || 0);
    setAdvanceAmount(inv.items?.advanceAmount || 0);
    setReceivedAmount(inv.items?.receivedAmount || 0);
    setIsEditMode(true);
    setEditBadge(`Editing Invoice: ${inv.invoiceNo}`);
    setOrganizationName(inv.organizationName || inv.items?.organizationName || "");
    setGstNumber(inv.gstNumber || inv.items?.gstNumber || "");
    setInvoiceId(inv.id);
  };

  const deleteInvoice = async () => {
    if (!isEditMode || !location.state?.editInvoice?.id) {
      showDialog({ title: "No Invoice Selected", message: "No saved invoice selected to delete. Please select an invoice from the history.", type: "alert" });
      return;
    }

    showDialog({
      title: "Delete Invoice",
      message: "Are you sure you want to delete this invoice? This action cannot be undone.",
      type: "confirm",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/finance/invoices/${location.state.editInvoice.id}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            showDialog({ title: "Deleted", message: "Invoice deleted successfully", type: "success" });
            setTimeout(() => navigate("/invoices"), 1500);
          } else {
            showDialog({ title: "Error", message: "Error deleting invoice", type: "error" });
          }
        } catch (err) {
          console.error(err);
          showDialog({ title: "Error", message: "Error connecting to server", type: "error" });
        }
      }
    });
  };

  const toggleBillType = (type) => {
    setBillType(type);
    const newGst = type === "Non-GST" ? 0 : 18;
    setNewItem((p) => ({ ...p, gstPerc: newGst }));

    setItems((prevItems) =>
      prevItems.map((item) => {
        const taxable = parseFloat(item.area || 1) * parseFloat(item.price);
        const gst = type === "Non-GST" ? 0 : (taxable * 18) / 100;
        return {
          ...item,
          gstPerc: type === "Non-GST" ? 0 : 18,
          gstAmount: gst,
          amount: taxable + gst,
        };
      }),
    );
  };

  const clearForm = () => {
    showDialog({
      title: "Clear Form",
      message: "Are you sure you want to clear all data in this invoice? This cannot be undone.",
      type: "confirm",
      onConfirm: () => {
        setItems([]);
        setClientName("");
        setClientAddress("");
        setProjectTitle("");
        setWorkDescription("");
        setDiscount(0);
        setLessAmount(0);
        setAdvanceAmount(0);
        setReceivedAmount(0);
        setIsEditMode(false);
        setEditBadge("");
        setOrganizationName("");
        setGstNumber("");
        setWorkOrderId("");
      }
    });
  };

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen font-sans flex flex-col">
      {/* Sessions Tab Bar */}
      <div className="bg-slate-800 px-2 pt-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-700">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${activeSessionId === s.id
                ? "bg-gray-200 text-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
              }`}
          >
            <FileText
              size={12}
              className={
                activeSessionId === s.id ? "text-blue-600" : "text-slate-500"
              }
            />
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
          className="p-1.5 text-blue-400 hover:text-blue-300 transition hover:bg-white/5 rounded-full mb-1"
          title="New Invoice Session"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Edit / Conversion Mode Banner */}
      {editBadge && (
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-bold ${isEditMode
              ? "bg-violet-600 text-white"
              : "bg-emerald-600 text-white"
            }`}
        >
          <div className="flex items-center gap-2">
            <Edit3 size={13} />
            {editBadge}
          </div>
          <button
            onClick={() => {
              setEditBadge("");
              setIsEditMode(false);
            }}
            className="opacity-70 hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!isAmountMatched && clientName && grandTotal > 0 && (
        <div className="px-4 py-2 flex items-center justify-between text-xs font-bold bg-rose-600 text-white">
          <div className="flex items-center gap-2">
            <RotateCcw size={13} />
            Discrepancy: Received Receipts (₹{totalReceipts.toFixed(2)}) ≠ Invoice Total (₹{grandTotal.toFixed(2)}). Printing disabled.
          </div>
        </div>
      )}

      {/* Invoice Info Bar */}
      <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Invoice Number
          </label>
          <div className="flex">
            <input
              disabled
              value={invoiceNo}
              className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-1 text-sm font-bold outline-none"
            />
            <button
              onClick={() => navigate("/invoices")}
              className="bg-blue-600 text-white px-2 hover:bg-blue-700 transition"
              title="View Invoice History"
            >
              <History size={14} />
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Invoice Date
          </label>
          <input
            disabled
            value={invoiceDate}
            className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-1 text-sm font-bold outline-none"
          />
        </div>
        {/* Bill Type Toggle */}
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Bill Type
          </label>
          <div className="flex bg-white/10 rounded p-0.5 gap-0.5">
            <button
              onClick={() => toggleBillType("GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "GST" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              GST
            </button>
            <button
              onClick={() => toggleBillType("Non-GST")}
              className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition ${billType === "Non-GST" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Non-GST
            </button>
          </div>
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Client Name
          </label>
          <div className="flex">
            <input
              placeholder="Select Work Order..."
              readOnly
              value={clientName}
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-blue-400 cursor-not-allowed opacity-60"
            />
            <button
              onClick={() => setShowWorkOrderSearch(true)}
              className="bg-indigo-600 text-white px-2 text-[10px] font-bold hover:bg-indigo-700 whitespace-nowrap"
            >
              SELECT WO
            </button>
            <button
              onClick={() => setShowQuoteSearch(true)}
              className="bg-amber-600 text-white px-2 text-[10px] font-bold hover:bg-amber-700 whitespace-nowrap"
            >
              FROM QUOTE
            </button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Site Address
          </label>
          <input
            readOnly
            placeholder="Work site address..."
            value={clientAddress}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-blue-400 cursor-not-allowed opacity-60"
          />
        </div>
        <div className="col-span-1 flex flex-col items-end justify-end text-[10px] font-bold pb-0.5">
          {billType === "GST" ? (
            <>
              <div>
                CGST:{" "}
                <span className="text-blue-700">
                  ₹{(totalGst / 2).toFixed(0)}
                </span>
              </div>
              <div>
                SGST:{" "}
                <span className="text-blue-700">
                  ₹{(totalGst / 2).toFixed(0)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-rose-600 font-black uppercase tracking-wider">
              Non-GST Bill
            </div>
          )}
        </div>
      </div>


      {/* Customer Organization & GST Number & Ref WO */}
      <div className="themed-card p-2 grid grid-cols-12 gap-2 border-b border-[var(--border-color)] items-end">
        <div className={billType === "GST" ? "col-span-5" : "col-span-10"}>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Customer Organization Name {billType === "Non-GST" && "(Optional)"}
          </label>
          <input
            placeholder="e.g. Acme Corporation Ltd"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-blue-400"
          />
        </div>
        {billType === "GST" && (
          <div className="col-span-5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Organization GST Number
            </label>
            <input
              placeholder="e.g. 27AAAAA1111A1Z1"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-blue-400 font-mono"
            />
          </div>
        )}
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">
            Work Order ID
          </label>
          <input
            readOnly
            placeholder="None"
            value={workOrderId}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none font-bold cursor-not-allowed opacity-60"
          />
        </div>
      </div>

      {/* Work Entry Row */}
      <div className="themed-card border-l-4 border-l-orange-400 p-1 grid grid-cols-12 gap-1 border-b border-[var(--border-color)]">
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-muted text-center uppercase">
            Work Description
          </label>
          <input
            ref={descRef}
            placeholder="e.g. False Ceiling"
            value={newItem.work}
            onChange={(e) => setNewItem({ ...newItem, work: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-muted text-center uppercase">
            Unit
          </label>
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm outline-none focus:border-orange-400"
          >
            <option>Sq.Ft</option>
            <option>L.Ft</option>
            <option>Nos</option>
            <option>LS</option>
          </select>
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-muted text-center uppercase">
            Area
          </label>
          <input
            type="number"
            value={newItem.area}
            onChange={(e) => setNewItem({ ...newItem, area: e.target.value })}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-center outline-none focus:border-orange-400"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-orange-800 text-center uppercase tracking-tighter">
            Price / Unit(₹)
          </label>
          <input
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-right outline-none focus:border-orange-400 font-bold"
          />
        </div>
        {billType === "GST" && (
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-muted text-center uppercase">
              GST %
            </label>
            <input
              type="number"
              value={newItem.gstPerc}
              onChange={(e) =>
                setNewItem({ ...newItem, gstPerc: e.target.value })
              }
              className="w-full themed-input border border-[var(--border-color)] px-2 py-1 text-sm text-center outline-none focus:border-orange-400"
            />
          </div>
        )}
        <div className={billType === "GST" ? "col-span-2" : "col-span-3"}>
          <label className="block text-[10px] font-bold text-muted text-center uppercase">
            {billType === "GST" ? "Total Incl Tax ₹" : "Amount ₹"}
          </label>
          <div className="w-full themed-card border border-[var(--border-color)] px-2 py-1 text-sm text-right font-bold text-orange-500 h-[26px]">
            {(
              parseFloat(newItem.area || 1) *
              parseFloat(newItem.price || 0) *
              (1 + parseFloat(newItem.gstPerc || 0) / 100)
            ).toFixed(2)}
          </div>
        </div>
        <div className="col-span-1 flex items-end">
          <button
            onClick={addItem}
            type="button"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-[26px] flex items-center justify-center rounded shadow-sm transition-all active:scale-95"
            title="Add Item to Invoice"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Main Table Area */}
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
              <th className="px-2 py-1 border-r border-gray-300 text-center w-16">
                Area
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-right w-24">
                Price
              </th>
              <th className="px-2 py-1 border-r border-gray-300 text-right w-24">
                Amount
              </th>
              {billType === "GST" && (
                <>
                  <th className="px-2 py-1 border-r border-gray-300 text-center w-12">
                    GST%
                  </th>
                  <th className="px-2 py-1 border-r border-gray-300 text-right w-20">
                    GST ₹
                  </th>
                </>
              )}
              <th className="px-2 py-1 text-right w-24">Net Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y themed-divider">
            {items.map((item, idx) => (
              <tr key={item.id} className="themed-row">
                <td className="px-2 py-1 border-r border-[var(--border-color)] text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => editItem(item)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center font-bold text-gray-400">
                  {idx + 1}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-left text-themed font-medium truncate max-w-[200px]" title={item.work}>
                  {item.work}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-center text-slate-400">
                  {item.unit}
                </td>
                <td className="px-2 py-1 border-r border-[var(--border-color)] text-center">
                  {item.area}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-right">
                  {parseFloat(item.price).toFixed(2)}
                </td>
                <td className="px-2 py-1 border-r border-white/10 text-right font-semibold text-slate-400">
                  {item.taxableAmount.toFixed(2)}
                </td>
                {billType === "GST" && (
                  <>
                    <td className="px-2 py-1 border-r border-white/10 text-center text-blue-600">
                      {item.gstPerc}%
                    </td>
                    <td className="px-2 py-1 border-r border-white/10 text-right text-blue-700 font-medium">
                      {item.gstAmount.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="px-2 py-1 text-right font-black text-themed">
                  {item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  className="py-20 text-center text-muted font-bold uppercase tracking-widest italic"
                >
                  No work details added to invoice
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
      <div className="themed-card p-2 border-t border-[var(--border-color)] flex justify-between items-end gap-4">
        {/* Left: Stats */}
        <div className="flex gap-4 mb-2">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 flex gap-2 items-center">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Tot Amount:</span>
            <span className="text-sm font-bold text-indigo-300">₹{subTotal.toFixed(2)}</span>
          </div>
          {billType === "GST" && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 flex gap-2 items-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Tot GST:</span>
                <span className="text-sm font-bold text-indigo-300">₹{totalGst.toFixed(2)}</span>
              </div>
          )}
          {billType === "Non-GST" && (
              <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 flex gap-2 items-center">
                <span className="text-[10px] font-black text-rose-400 uppercase">Non-GST Bill — No Tax</span>
              </div>
          )}
          {clientName && (
              <div className={`border px-3 py-1 flex gap-2 items-center ${isAmountMatched && grandTotal > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
                <span className={`text-[10px] font-bold uppercase ${isAmountMatched && grandTotal > 0 ? "text-emerald-400" : "text-rose-400"}`}>Total Receipts:</span>
                <span className={`text-sm font-black ${isAmountMatched && grandTotal > 0 ? "text-emerald-300" : "text-rose-300"}`}>₹{totalReceipts.toFixed(2)}</span>
              </div>
          )}
        </div>

        {/* Center: Adjustments */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-white/5 border border-white/10 p-2 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase">Invoice Disc %</label>
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
              className="w-20 themed-input border border-[var(--border-color)] px-1 py-0.5 text-xs text-right outline-none focus:border-orange-400 rounded" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase">Invoice Less ₹</label>
            <input type="number" value={lessAmount} onChange={(e) => setLessAmount(e.target.value)}
              className="w-20 themed-input border border-[var(--border-color)] px-1 py-0.5 text-xs text-right outline-none focus:border-orange-400 rounded" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase">Amount Received</label>
            <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-20 themed-input border border-[var(--border-color)] px-1 py-0.5 text-xs text-right outline-none focus:border-orange-400 rounded" />
          </div>
        </div>

        {/* Right: Big Total */}
        <div className="flex items-center gap-4">
          <div className="text-4xl text-slate-400 font-light">₹</div>
          <div className="themed-card border border-[var(--border-color)] px-10 py-2 rounded shadow-inner text-right min-w-[200px]">
            <div className="text-[10px] font-bold text-amber-400 uppercase -mb-1">Net Payable</div>
            <div className="text-5xl font-black text-emerald-400 tracking-tighter">{grandTotal.toFixed(2)}</div>
            <div className="text-[10px] font-bold text-muted uppercase mt-1">Bal: ₹{balanceAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-slate-800 p-1 flex justify-center gap-1">
        <button
          onClick={clearForm}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <RotateCcw size={14} /> Clear - F8
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <History size={14} /> Invoices - F9
        </button>
        <button
          onClick={deleteInvoice}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm"
        >
          <Trash2 size={14} /> Delete - F1
        </button>
        <button
          onClick={triggerPrint}
          className={`${!isAmountMatched && grandTotal > 0 ? "bg-slate-400 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-600"} text-white px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm`}
        >
          <Printer size={14} /> Print - F5
        </button>
        <button
          onClick={saveInvoice}
          className={`${!isAmountMatched && grandTotal > 0 ? "bg-slate-600 hover:bg-slate-700" : isEditMode ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white px-8 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition shadow-sm`}
        >
          {isEditMode ? <Edit3 size={14} /> : <Save size={14} />}
          {!isAmountMatched && grandTotal > 0 ? "Save as Draft" : isEditMode ? "Update Invoice" : "Save - F2"}
        </button>
      </div>

      {/* MODALS */}
      {showQuoteSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="themed-modal border border-[var(--border-color)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-amber-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Search size={20} /> Fetch from Saved Quotations
              </h3>
              <button onClick={() => setShowQuoteSearch(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {savedQuotations.length === 0 && (
                <p className="text-center text-slate-400 dark:text-slate-500 py-10">
                  No saved quotations found.
                </p>
              )}
              <div className="grid gap-2">
                {savedQuotations.map((q) => (
                  <div
                    key={q.id}
                    className="border border-[var(--border-color)] p-3 rounded-xl hover:bg-amber-500/10 flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-bold text-themed">{q.clientName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {q.date} | {q.items.length} Items
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {q.clientAddress}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchFromQuote(q)}
                      className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg font-bold text-xs hover:bg-amber-500/20 transition"
                    >
                      SELECT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showWorkOrderSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="themed-modal border border-[var(--border-color)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Search size={20} /> Select Work Order
              </h3>
              <button onClick={() => setShowWorkOrderSearch(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {workOrders.length === 0 && (
                <p className="text-center text-slate-400 dark:text-slate-500 py-10">
                  No work orders found.
                </p>
              )}
              <div className="grid gap-2">
                {workOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="border border-[var(--border-color)] p-3 rounded-xl hover:bg-indigo-500/10 flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-bold text-themed">{wo.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {wo.clientName} | {wo.status}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {wo.address}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchFromWorkOrder(wo)}
                      className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-500/20 transition"
                    >
                      SELECT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="opacity-0 fixed top-0 left-0 pointer-events-none">
        <PrintableInvoice
          ref={componentRef}
          data={{
            customer: clientName,
            address: clientAddress,
            projectTitle,
            workDescription,
            items,
            invoiceNo,
            invoiceDate,
            discount,
            lessAmount,
            advanceAmount,
            receivedAmount,
            subTotal,
            totalGst,
            grandTotal,
            balanceAmount,
            billType,
            organizationName,
            gstNumber,
            workOrderId,
          }}
          docType="Invoice"
        />
      </div>
    </div>
  );
}
