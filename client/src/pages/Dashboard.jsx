import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, Receipt, ArrowUpRight, Users, Calendar,
  FileText, Plus, Target, Building, IndianRupee, Activity, ChevronDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];


const Dashboard = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const getIsoDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getIsoDate(currentDate);
  const firstOfMonth = getIsoDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

    const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo]   = useState(today);
    const [activePreset, setActivePreset] = useState("this_month");

  const handlePresetChange = (e) => {
    const preset = e.target.value;
    setActivePreset(preset);
    if (!preset || preset === "custom") return;

    const t = new Date();
    
    if (preset === "this_month") {
      const first = new Date(t.getFullYear(), t.getMonth(), 1);
      setDateFrom(getIsoDate(first));
      setDateTo(getIsoDate(t));
    } else if (preset === "last_month") {
      const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const last = new Date(t.getFullYear(), t.getMonth(), 0);
      setDateFrom(getIsoDate(first));
      setDateTo(getIsoDate(last));
    } else if (preset === "last_6_months") {
      const first = new Date(t.getFullYear(), t.getMonth() - 6, t.getDate());
      setDateFrom(getIsoDate(first));
      setDateTo(getIsoDate(t));
    } else if (preset === "financial_year") {
      const currentMonth = t.getMonth(); // 0 = Jan, 3 = Apr
      const startYear = currentMonth >= 3 ? t.getFullYear() : t.getFullYear() - 1;
      const first = new Date(startYear, 3, 1);
      const last = new Date(startYear + 1, 2, 31);
      setDateFrom(getIsoDate(first));
      setDateTo(getIsoDate(last));
    }
  };

  const handleDateChange = (type, value) => {
    if (type === "from") setDateFrom(value);
    else setDateTo(value);
    setActivePreset("custom");
  };

  const [invoices, setInvoices]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [crm, setCrm]             = useState([]);
  const [sites, setSites]         = useState([]);
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState({});

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [invRes, expRes, crmRes, siteRes, empRes, attRes] = await Promise.all([
          fetch('/api/finance/invoices').then(r => r.json()),
          fetch('/api/finance/expenses').then(r => r.json()),
          fetch('/api/crm').then(r => r.json()),
          fetch('/api/sites').then(r => r.json()),
          fetch('/api/employees').then(r => r.json()),
          fetch('/api/attendance').then(r => r.json()),
        ]);

        // Fix dates if they come as full ISO strings
        setInvoices(invRes.map(i => ({...i, date: i.date ? i.date.split('T')[0] : ''})));
        setExpenses(expRes.map(e => ({...e, date: e.date ? e.date.split('T')[0] : ''})));
        setCrm(crmRes.map(c => ({...c, date: c.date ? c.date.split('T')[0] : ''})));
        setSites(siteRes.map(s => ({...s, startDate: s.start_date, endDate: s.end_date})));
        setEmployees(empRes);
        setAttendance(attRes || {});
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchAllData();
  }, []);

  // ── DATE FILTER HELPER ──────────────────────────────────────────────────────
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= dateFrom && dateStr <= dateTo;
  };

  // ── FINANCE ─────────────────────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(i => inRange(i.date) && i.status !== "Draft");
  const filteredExpenses  = expenses.filter(e => inRange(e.date));

  // Revenue = total billed (all non-draft invoices)
  const totalRevenueBilled  = filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  // Collected Income = only Paid invoices
  const totalCollected = filteredInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (Number(i.total) || 0), 0);
  // Pending = billed but not yet paid
  const totalPending   = totalRevenueBilled - totalCollected;
  const totalExpenses  = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit      = totalCollected - totalExpenses;
  const paidCount      = filteredInvoices.filter(i => i.status === "Paid").length;
  const pendingCount   = filteredInvoices.filter(i => i.status !== "Paid").length;

  // Monthly 6‑month trend – Billed vs Collected vs Expenses (independent of date filter)
  const getRevenueTrend = () => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months[key] = { name: d.toLocaleString("default", { month: "short" }), Billed: 0, Collected: 0, Pending: 0 };
    }
    invoices.forEach(inv => {
      const m = inv.date?.slice(0, 7);
      if (!months[m] || inv.status === "Draft") return;
      const amt = Number(inv.total) || 0;
      months[m].Billed += amt;
      if (inv.status === "Paid") months[m].Collected += amt;
      else months[m].Pending += amt;
    });
    return Object.values(months);
  };

  const getExpenseTrend = () => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months[key] = { name: d.toLocaleString("default", { month: "short" }), Expenses: 0 };
    }
    expenses.forEach(exp => {
      const m = exp.date?.slice(0, 7);
      if (months[m]) months[m].Expenses += Number(exp.amount) || 0;
    });
    return Object.values(months);
  };

  // ── CRM ─────────────────────────────────────────────────────────────────────
  const filteredCRM    = crm.filter(l => inRange(l.date));
  const totalLeads     = filteredCRM.length;
  const converted      = filteredCRM.filter(l => l.status === "Converted").length;
  const convRate       = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0;

  const leadSources = (() => {
    const src = {};
    filteredCRM.forEach(l => { const s = l.source || "Other"; src[s] = (src[s] || 0) + 1; });
    return Object.keys(src).map(k => ({ name: k, value: src[k] }));
  })();

  const crmPipeline = (() => {
    const stages = ["New Lead", "Contacted", "Negotiating", "Converted", "Lost"];
    return stages.map(stage => ({
      stage,
      count: filteredCRM.filter(l => l.status === stage).length
    })).filter(s => s.count > 0);
  })();

  // ── PROJECTS ─────────────────────────────────────────────────────────────────
  const activeSites    = sites.filter(s => s.status === "Active").length;
  const completedSites = sites.filter(s => s.status === "Completed").length;
  const siteStatus = (() => {
    const dist = {};
    sites.forEach(s => { const k = s.status || "Active"; dist[k] = (dist[k] || 0) + 1; });
    return Object.keys(dist).map(k => ({ name: k, count: dist[k] }));
  })();

  // ── HR / ATTENDANCE ─────────────────────────────────────────────────────────
  const activeEmployees = employees.filter(e => e.status === "Active").length;
  const todayAtt = (attendance && typeof attendance === "object" && attendance[today])
    ? attendance[today].records || {}
    : {};
  const presentToday = Object.values(todayAtt).filter(r => r.status === "present").length;
  const absentToday  = employees.length - presentToday;

  const monthlyPayroll = employees
    .filter(e => e.status === "Active" && e.salaryType === "Monthly")
    .reduce((s, e) => s + (Number(e.salary) || 0), 0);

  // ── RENDER HELPERS ───────────────────────────────────────────────────────────
  const StatCard = ({ title, value, sub, icon: Icon, iconBg, iconText, trend, isUp }) => (
    <div className="themed-card p-5 rounded-3xl flex flex-col justify-between h-36 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconText}`}><Icon size={20} /></div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-black ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-2xl font-black text-themed">{value}</p>
        {sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[var(--border-color)]" />
    </div>
  );

  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 md:p-6 page-wrapper">
      {/* No background orbs - keep it clean */}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <div>
          <h1 className="text-xl font-black text-themed tracking-tight">Business Dashboard</h1>
          <p className="text-slate-400 font-medium text-xs mt-0.5">Mona Interior — Real‑time intelligence, filtered by date.</p>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3 themed-card rounded-2xl p-3">
          <div className="flex flex-col relative group">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quick Select</span>
             <div className="flex items-center">
               <select value={activePreset} onChange={handlePresetChange} className="text-sm font-black text-themed bg-transparent outline-none cursor-pointer w-[115px] appearance-none pr-6">
                  <option value="custom">Custom</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="financial_year">Financial Year</option>
               </select>
               <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-1" />
             </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">From</span>
            <input type="date" value={dateFrom} max={dateTo} onChange={e => handleDateChange("from", e.target.value)}
              className="text-sm font-black text-white bg-transparent outline-none cursor-pointer w-32" />
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">To</span>
            <input type="date" value={dateTo} min={dateFrom} onChange={e => handleDateChange("to", e.target.value)}
              className="text-sm font-black text-white bg-transparent outline-none cursor-pointer w-32" />
          </div>
        </div>
      </div>

      {/* ── FINANCE STATS ──────────────────────────────────────────────── */}
      <SectionTitle>Finance</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Billed (Revenue)"   value={fmt(totalRevenueBilled)} icon={IndianRupee} iconBg="bg-indigo-500/10"  iconText="text-indigo-600" sub="Total Invoiced" />
        <StatCard title="Collected (Income)" value={fmt(totalCollected)}     icon={TrendingUp}  iconBg="bg-emerald-500/10" iconText="text-emerald-600" sub={`${paidCount} Invoices Paid`} trend={paidCount > 0 ? "Received" : undefined} isUp />
        <StatCard title="Pending Payments"   value={fmt(totalPending)}       icon={Activity}    iconBg="bg-amber-500/10"   iconText="text-amber-600" sub={`${pendingCount} Invoices Due`} trend={pendingCount > 0 ? `${pendingCount} Unpaid` : undefined} isUp={false} />
        <StatCard title="Net Profit"         value={fmt(netProfit)}          icon={Receipt}     iconBg={netProfit >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"} iconText={netProfit >= 0 ? "text-emerald-600" : "text-rose-600"} trend={netProfit >= 0 ? "Profitable" : "Loss"} isUp={netProfit >= 0} />
      </div>

      {/* ── FINANCE CHARTS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Chart 1: Revenue Billed vs Collected Income */}
        <div className="themed-card rounded-[32px] p-6">
          <div className="mb-4">
            <h3 className="font-black text-themed flex items-center gap-2 text-sm">
              <IndianRupee className="text-indigo-500" size={16}/> Revenue vs Collected Income
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Gap = Pending Payments · 6 Month View</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height={224} minWidth={1}>
              <BarChart data={getRevenueTrend()} margin={{ top:5, right:10, left:0, bottom:5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} tickFormatter={v => `₹${v/1000}k`} width={45} />
                <Tooltip
                  contentStyle={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', background:'#1e293b', color:'#f1f5f9' }}
                  formatter={(v, name) => [`₹${Number(v).toLocaleString()}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize:'11px', fontWeight:700, paddingTop:'12px' }} />
                <Bar dataKey="Billed"    fill="#c7d2fe" radius={[6,6,0,0]} name="Billed" />
                <Bar dataKey="Collected" fill="#4f46e5" radius={[6,6,0,0]} name="Collected" />
                <Bar dataKey="Pending"   fill="#fbbf24" radius={[6,6,0,0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Expenses */}
        <div className="themed-card rounded-[32px] p-6">
          <div className="mb-4">
            <h3 className="font-black text-themed flex items-center gap-2 text-sm">
              <Receipt className="text-rose-500" size={16}/> Monthly Expenses
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Total outflows tracked · 6 Month View</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height={224} minWidth={1}>
              <BarChart data={getExpenseTrend()} margin={{ top:5, right:10, left:0, bottom:5 }} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} tickFormatter={v => `₹${v/1000}k`} width={45} />
                <Tooltip
                  contentStyle={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', background:'#1e293b', color:'#f1f5f9' }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Expenses"]}
                />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── CRM & PROJECTS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* CRM */}
        <div className="themed-card rounded-[32px] p-6">
          <SectionTitle>CRM & Sales</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{totalLeads}</p>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mt-0.5">Leads</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{converted}</p>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mt-0.5">Converted</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{convRate}%</p>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mt-0.5">Conv. Rate</p>
            </div>
          </div>

          {leadSources.length > 0 ? (
            <div className="h-48 w-full">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lead Sources</p>
              <ResponsiveContainer width="100%" height={192} minWidth={1}>
                <PieChart>
                  <Pie data={leadSources} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {leadSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', background:'#1e293b', color:'#f1f5f9' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize:'11px', fontWeight:700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 font-bold text-sm">No CRM data for this period.</div>
          )}
        </div>

        {/* Projects */}
        <div className="themed-card rounded-[32px] p-6">
          <SectionTitle>Projects & Sites</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">{activeSites}</p>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-0.5">Active Sites</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{completedSites}</p>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mt-0.5">Completed</p>
            </div>
          </div>

          {siteStatus.length > 0 ? (
            <div className="h-48 w-full">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Distribution</p>
              <ResponsiveContainer width="100%" height={192} minWidth={1}>
                <BarChart data={siteStatus} barSize={32} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
                  <Tooltip cursor={{ fill:'#f8fafc' }} contentStyle={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', background:'#1e293b', color:'#f1f5f9' }} />
                  <Bar dataKey="count" radius={[8,8,0,0]}>
                    {siteStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 font-bold text-sm">No project data available.</div>
          )}
        </div>
      </div>

      {/* ── HR & EMPLOYEES ─────────────────────────────────────────────── */}
      <SectionTitle>HR & Employees</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Staff"    value={employees.length} icon={Users}     iconBg="bg-blue-500/10"   iconText="text-blue-600"   sub={`${activeEmployees} Active`} />
        <StatCard title="Present Today"  value={presentToday}     icon={Calendar}  iconBg="bg-emerald-500/10" iconText="text-emerald-600" sub={`${absentToday} Absent`} />
        <StatCard title="Monthly Payroll" value={fmt(monthlyPayroll)} icon={Wallet} iconBg="bg-purple-500/10" iconText="text-purple-600" />
        <StatCard title="Active Projects" value={activeSites}     icon={Building}  iconBg="bg-amber-500/10"  iconText="text-amber-600" />
      </div>

      {/* ── RECENT ACTIVITY + QUICK ACTIONS ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Invoices */}
        <div className="lg:col-span-2 themed-card rounded-[32px] p-6">
          <h3 className="font-black text-themed mb-4 flex items-center gap-2"><FileText className="text-indigo-500" size={18}/> Recent Invoices</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="themed-thead text-[10px] font-black uppercase tracking-widest">
                <th className="pb-3 px-2">Client</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2 text-right">Amount</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y themed-divider">
              {invoices.slice(-5).reverse().map((inv, i) => (
                <tr key={i} className="hover:bg-white/5/50 transition">
                  <td className="py-3 px-2 font-bold text-sm text-themed">{inv.clientName || "—"}</td>
                  <td className="py-3 px-2 text-xs font-bold text-slate-400">{inv.date}</td>
                  <td className="py-3 px-2 text-right font-black text-themed text-sm">{fmt(inv.total)}</td>
                  <td className="py-3 px-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${inv.status === "Paid" ? "bg-emerald-500/15 text-emerald-400" : inv.status === "Draft" ? "bg-slate-700/30 text-slate-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-400 font-bold text-sm">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="themed-card rounded-[32px] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-themed text-lg mb-6 uppercase tracking-tight">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: "Create Quotation", path: "/quotations", icon: FileText },
                { label: "Create Invoice",   path: "/billing",    icon: Receipt  },
                { label: "Add Expense",      path: "/expenses",   icon: Wallet   },
                { label: "Add Employee",     path: "/employees",  icon: Users    },
                { label: "Log Attendance",   path: "/attendance", icon: Calendar },
              ].map(({ label, path, icon: Icon }) => (
                <button key={path} onClick={() => navigate(path, { state: { newSession: (path === "/billing" || path === "/quotations") } })}
                 className="w-full bg-white/5 hover:bg-[var(--accent)] text-themed hover:text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
