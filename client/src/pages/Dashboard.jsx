import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Receipt, Users, Calendar, Target,
  FileText, Building, IndianRupee, Activity, ChevronDown, PieChart as PieChartIcon, ArrowRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend
} from "recharts";

import { useTheme } from "../contexts/ThemeContext";

const COLORS = ['#C9A227', '#3D5A8A', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
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
  const [dateTo, setDateTo] = useState(today);
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

  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [crm, setCrm] = useState([]);
  const [sites, setSites] = useState([]);
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

        setInvoices(invRes.map(i => ({ ...i, date: i.date ? i.date.split('T')[0] : '' })));
        setExpenses(expRes.map(e => ({ ...e, date: e.date ? e.date.split('T')[0] : '' })));
        setCrm(crmRes.map(c => ({ ...c, date: c.date ? c.date.split('T')[0] : '' })));
        setSites(siteRes.map(s => ({ ...s, startDate: s.start_date, endDate: s.end_date })));
        setEmployees(empRes);
        setAttendance(attRes || {});
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchAllData();
  }, []);

  // ── DATE FILTER HELPER
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= dateFrom && dateStr <= dateTo;
  };

  // ── CALCULATIONS
  const filteredInvoices = invoices.filter(i => inRange(i.date) && i.status !== "Draft");
  const filteredExpenses = expenses.filter(e => inRange(e.date));
  const totalRevenueBilled = filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalCollected = filteredInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPending = totalRevenueBilled - totalCollected;
  const paidCount = filteredInvoices.filter(i => i.status === "Paid").length;

  const filteredCRM = crm.filter(l => inRange(l.date));
  const totalLeads = filteredCRM.length;
  const converted = filteredCRM.filter(l => l.status === "Converted").length;
  const convRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0;

  const activeSites = sites.filter(s => s.status === "Active").length;
  const completedSites = sites.filter(s => s.status === "Completed").length;

  const activeEmployees = employees.filter(e => e.status === "Active").length;
  const monthlyPayroll = employees
    .filter(e => e.status === "Active" && e.salaryType === "Monthly")
    .reduce((s, e) => s + (Number(e.salary) || 0), 0);

  // ── CHARTS DATA
  const getCashFlowTrend = () => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months[key] = { name: d.toLocaleString("default", { month: "short" }), Billed: 0, Collected: 0 };
    }
    invoices.forEach(inv => {
      const m = inv.date?.slice(0, 7);
      if (!months[m] || inv.status === "Draft") return;
      const amt = Number(inv.total) || 0;
      months[m].Billed += amt;
      if (inv.status === "Paid") months[m].Collected += amt;
    });
    return Object.values(months);
  };

  const expenseBreakdown = (() => {
    const categories = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.keys(categories).map(k => ({ name: k, value: categories[k] })).sort((a,b)=>b.value - a.value);
  })();

  const crmPipeline = (() => {
    const stages = ["New Lead", "Contacted", "Negotiating", "Converted"];
    return stages.map(stage => ({
      stage,
      count: filteredCRM.filter(l => l.status === stage).length
    })).filter(s => s.count > 0);
  })();

  const sparklineData = (() => {
    const data = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let amt = 0;
      invoices.forEach(inv => {
        if (inv.date === dateStr && inv.status === "Paid") amt += (Number(inv.total) || 0);
      });
      data.push({ date: dateStr, amount: amt });
    }
    return data;
  })();

  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${isDarkMode ? 'bg-slate-900/90 border-white/10 text-slate-300' : 'bg-white border-[#E1E4E8] text-[#1C2B4B]'} backdrop-blur-md border p-3 rounded-xl shadow-2xl`}>
          <p className="text-[11px] font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-bold flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' && entry.name !== 'count' ? fmt(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-transparent dark:bg-slate-950 font-sans">
      
      {/* ── HEADER & DATE PICKER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Business Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1 uppercase tracking-widest">Real-time Data Intelligence</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-2xl p-2 shadow-sm">
          <div className="flex flex-col relative px-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Timeline</span>
            <div className="flex items-center">
              <select value={activePreset} onChange={handlePresetChange} className="text-xs font-black text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-[105px] appearance-none">
                <option value="custom">Custom Range</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="financial_year">Financial Year</option>
              </select>
              <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-1" />
            </div>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-white/10" />
          <input type="date" value={dateFrom} max={dateTo} onChange={e => handleDateChange("from", e.target.value)}
            className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer" />
          <span className="text-slate-400 text-xs font-black">→</span>
          <input type="date" value={dateTo} min={dateFrom} onChange={e => handleDateChange("to", e.target.value)}
            className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer pr-2" />
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-12 gap-6">

        {/* ── ADVANCED KPI CARDS (Top Row) ── */}
        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <IndianRupee size={80} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Wallet size={12}/> Cash Collected</p>
          <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{fmt(totalCollected)}</h2>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-2">Past 14 Days Velocity</p>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-colors">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><TrendingUp size={12}/> Pending Receivables</p>
          <h2 className="text-3xl font-black text-amber-600 dark:text-amber-400">{fmt(totalPending)}</h2>
          <div className="mt-4 flex items-center gap-3">
             <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
               <div className="bg-amber-500 h-full" style={{ width: `${totalRevenueBilled > 0 ? (totalPending/totalRevenueBilled)*100 : 0}%` }}></div>
             </div>
             <span className="text-xs font-black text-amber-500">{totalRevenueBilled > 0 ? Math.round((totalPending/totalRevenueBilled)*100) : 0}%</span>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-4">Of total {fmt(totalRevenueBilled)} billed</p>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Target size={12}/> CRM Conversion</p>
            <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400">{convRate}%</h2>
          </div>
          <div className="flex justify-between items-end mt-4">
             <div>
               <p className="text-xs font-bold text-slate-500">Total Leads: <span className="text-slate-800 dark:text-white">{totalLeads}</span></p>
               <p className="text-xs font-bold text-slate-500">Converted: <span className="text-blue-600 dark:text-blue-400">{converted}</span></p>
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                <div className="w-8 h-8 bg-blue-500/10 rounded-full"></div>
             </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition-colors flex flex-col justify-between">
           <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Building size={12}/> Operations & HR</p>
            <h2 className="text-3xl font-black text-purple-600 dark:text-purple-400">{activeSites} Sites</h2>
          </div>
          <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Active Staff</span>
               <span className="text-sm font-black text-slate-800 dark:text-slate-200">{activeEmployees}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Payroll Outflow</span>
               <span className="text-sm font-black text-slate-800 dark:text-slate-200">{fmt(monthlyPayroll)}</span>
             </div>
          </div>
        </motion.div>


        {/* ── LEFT COLUMN: MAIN GRAPHS (70%) ── */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
          
          {/* Cash Flow Area Chart */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Cash Flow Dynamics</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Billed Revenue vs Collected Income over 6 months</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getCashFlowTrend()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(28,43,75,0.06)"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:700, fill: isDarkMode ? '#64748b' : '#6B7C99' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:700, fill: isDarkMode ? '#64748b' : '#6B7C99' }} tickFormatter={v => `₹${v/1000}k`} width={50} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize:'11px', fontWeight:700, paddingTop:'20px' }} />
                  <Area type="monotone" dataKey="Billed" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBilled)" />
                  <Area type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* CRM Funnel */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm">
             <div className="mb-6">
                <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Sales Conversion Funnel</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Lead progression through pipeline stages</p>
              </div>
              <div className="h-64 w-full">
              {crmPipeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crmPipeline} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(28,43,75,0.06)"} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:800, fill: isDarkMode ? '#64748b' : '#6B7C99' }} width={90} />
                    <RechartsTooltip cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(28,43,75,0.03)'}} content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0,8,8,0]} barSize={24} name="Leads">
                      {crmPipeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No CRM data available</div>
              )}
              </div>
          </motion.div>

        </div>


        {/* ── RIGHT COLUMN: DONUT & ACTIONS (30%) ── */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">

          {/* Quick Actions Bento Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
             {[
                { label: "New Quote",   path: "/quotations", color: "from-blue-500 to-cyan-500" },
                { label: "New Invoice", path: "/billing",    color: "from-emerald-500 to-teal-500" },
                { label: "Log Expense", path: "/expenses",   color: "from-rose-500 to-pink-500" },
                { label: "Add Staff",   path: "/employees",  color: "from-purple-500 to-indigo-500" },
              ].map((btn, i) => (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} key={i} onClick={() => navigate(btn.path)}
                  className={`bg-gradient-to-br ${btn.color} p-4 rounded-3xl text-left shadow-lg relative overflow-hidden group`}>
                   <div className="absolute -right-4 -top-4 bg-white/20 w-16 h-16 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                   <p className="text-white font-black text-sm relative z-10 leading-tight">{btn.label}</p>
                   <ArrowRight size={14} className="text-white/80 mt-2 relative z-10" />
                </motion.button>
              ))}
          </motion.div>

          {/* Expense Donut Chart */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 shadow-sm flex-1">
             <div className="mb-4">
                <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Expense Breakdown</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Categorized outflows</p>
              </div>
              <div className="h-56 w-full relative">
                {expenseBreakdown.length > 0 ? (
                  <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                     <span className="text-lg font-black text-slate-800 dark:text-white">{fmt(expenseBreakdown.reduce((a,b)=>a+b.value,0))}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  </>
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No expenses logged</div>
                )}
              </div>
              
              {/* Custom Legend */}
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto no-scrollbar pr-2">
                 {expenseBreakdown.map((cat, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{cat.name}</span>
                     </div>
                     <span className="text-xs font-black text-slate-800 dark:text-slate-100">{fmt(cat.value)}</span>
                   </div>
                 ))}
              </div>
          </motion.div>

        </div>

      </motion.div>
    </div>
  );
};

export default Dashboard;
