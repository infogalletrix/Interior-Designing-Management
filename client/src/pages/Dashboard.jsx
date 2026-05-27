import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Users, Clock,
  FileText, Building, Activity, ChevronDown, ArrowRight,
  HardHat, ClipboardCheck, Banknote, CalendarCheck, IndianRupee
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

import { useThemeClasses } from "../hooks/useThemeClasses";
import NotificationWidget from "../components/NotificationWidget";

// Light: gold / navy palette  |  Dark: violet palette
// Light: gold / navy palette  |  Dark: violet palette
const CHART_COLORS_LIGHT = ['#C9A227', '#1C2B4B', '#3D5A8A', '#E5C558', '#8F7A33', '#0F1A30'];
const CHART_COLORS_DARK  = ['#8b5cf6', '#6366f1', '#a855f7', '#3b82f6', '#ec4899', '#c084fc'];

const Dashboard = () => {
  const navigate = useNavigate();
  const t = useThemeClasses();
  const d = t.isDark;
  const COLORS = d ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  // accent colours derived from theme
  const accentMain   = d ? '#8b5cf6' : '#C9A227';
  const accentSecond = d ? '#38bdf8' : '#3D5A8A';
  const incomeColor  = '#10b981';
  const expenseColor = d ? '#f43f5e' : '#ef4444';

  const getIsoDate = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const now = new Date();
  const today = getIsoDate(now);
  const firstOfMonth = getIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo,   setDateTo]   = useState(today);
  const [activePreset, setActivePreset] = useState("this_month");

  const handlePresetChange = (e) => {
    const p = e.target.value;
    setActivePreset(p);
    const c = new Date();
    if (p === "this_month") {
      setDateFrom(getIsoDate(new Date(c.getFullYear(), c.getMonth(), 1)));
      setDateTo(getIsoDate(c));
    } else if (p === "last_month") {
      setDateFrom(getIsoDate(new Date(c.getFullYear(), c.getMonth() - 1, 1)));
      setDateTo(getIsoDate(new Date(c.getFullYear(), c.getMonth(), 0)));
    } else if (p === "last_6_months") {
      setDateFrom(getIsoDate(new Date(c.getFullYear(), c.getMonth() - 6, c.getDate())));
      setDateTo(getIsoDate(c));
    } else if (p === "financial_year") {
      const sy = c.getMonth() >= 3 ? c.getFullYear() : c.getFullYear() - 1;
      setDateFrom(getIsoDate(new Date(sy, 3, 1)));
      setDateTo(getIsoDate(new Date(sy + 1, 2, 31)));
    }
  };

  const handleDateChange = (type, val) => {
    if (type === "from") setDateFrom(val); else setDateTo(val);
    setActivePreset("custom");
  };

  const [receipts,   setReceipts]   = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [sites,      setSites]      = useState([]);
  const [payroll,    setPayroll]    = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rR, eR, sR, pR, emR, qR, aR] = await Promise.all([
          fetch('/api/finance/receipts').then(r => r.ok ? r.json() : []),
          fetch('/api/finance/expenses').then(r => r.ok ? r.json() : []),
          fetch('/api/sites').then(r => r.ok ? r.json() : []),
          fetch('/api/finance/payroll').then(r => r.ok ? r.json() : []),
          fetch('/api/employees').then(r => r.ok ? r.json() : []),
          fetch('/api/quotations').then(r => r.ok ? r.json() : []),
          fetch('/api/attendance').then(r => r.ok ? r.json() : {}),
        ]);
        setReceipts(Array.isArray(rR) ? rR.map(i => ({ ...i, date: (i.date||'').split('T')[0] })) : []);
        setExpenses(Array.isArray(eR) ? eR.map(i => ({ ...i, date: (i.date||'').split('T')[0] })) : []);
        setSites(Array.isArray(sR) ? sR : []);
        setPayroll(Array.isArray(pR) ? pR : []);
        setEmployees(Array.isArray(emR) ? emR : []);
        setQuotations(Array.isArray(qR) ? qR : []);
        setAttendance(aR || {});
      } catch(err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const inRange = (ds) => ds && ds >= dateFrom && ds <= dateTo;

  // ── KPI Calculations ──
  // Calculate credits and debits from expenses properly
  const creditExpenses = expenses.filter(e => inRange(e.date) && (e.type === "Bank Credit" || e.type === "Credit")).reduce((s,e) => s+(Number(e.amount)||0), 0);
  const debitExpenses = expenses.filter(e => inRange(e.date) && e.type !== "Bank Credit" && e.type !== "Credit").reduce((s,e) => s+(Number(e.amount)||0), 0);

  const receiptIncome     = receipts.filter(r => inRange(r.date)).reduce((s,r) => s+(Number(r.amountPaid || r.amount)||0), 0);
  const totalPayroll      = payroll.filter(p => inRange(p.paymentDate||p.date||dateFrom)).reduce((s,p) => s+(Number(p.netPay||p.amount)||0), 0);

  const totalIncome       = receiptIncome + creditExpenses;
  const totalSpent        = debitExpenses + totalPayroll;
  const totalWOValue      = sites.reduce((s,st) => s+(Number(st.budget)||0), 0);
  const totalAdvances     = employees.reduce((s,e) => s+(Number(e.advanceBalance)||0), 0);
  const pendingQuotes     = quotations.filter(q => q.status === "Pending" || !q.status).length;
  const inProcessSites    = sites.filter(s => s.status === "In Progress" || s.status === "Active").length;
  const pendingWO         = sites.filter(s => s.status === "Pre-Construction" || s.status === "Pending").length;
  const presentToday      = attendance[today] ? Object.values(attendance[today]).filter(s => s==="Present"||s==="Half-Day").length : 0;
  const netProfit         = totalIncome - totalSpent;
  const profitPositive    = netProfit >= 0;

  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

  // ── Chart data ──
  const cashFlowData = (() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth()-i);
      const key = dt.toISOString().slice(0,7);
      months[key] = { name: dt.toLocaleString("default",{month:"short"}), Income: 0, Expenses: 0 };
    }
    receipts.forEach(r => { const m=r.date?.slice(0,7); if(months[m]) months[m].Income+=(Number(r.amountPaid||r.amount)||0); });
    expenses.forEach(e => {
      const m = e.date?.slice(0,7);
      if(months[m]) {
        if (e.type === "Bank Credit" || e.type === "Credit") months[m].Income += (Number(e.amount)||0);
        else months[m].Expenses += (Number(e.amount)||0);
      }
    });
    payroll.forEach(p => {
      const m = (p.paymentDate||p.date||'').slice(0,7);
      if(months[m]) months[m].Expenses += (Number(p.netPay||p.amount)||0);
    });
    return Object.values(months);
  })();

  const expenseBreakdown = (() => {
    const cats = {};
    expenses.filter(e=>inRange(e.date) && e.type !== "Bank Credit" && e.type !== "Credit").forEach(e => {
      const c = e.category||"Other";
      cats[c] = (cats[c]||0)+(Number(e.amount)||0);
    });
    payroll.filter(p=>inRange(p.paymentDate||p.date||dateFrom)).forEach(p => {
      cats["Payroll"] = (cats["Payroll"]||0) + (Number(p.netPay||p.amount)||0);
    });
    return Object.keys(cats).map(k=>({name:k,value:cats[k]})).sort((a,b)=>b.value-a.value).slice(0,6);
  })();

  const siteStatusData = [
    { name: "In Progress", value: inProcessSites },
    { name: "Pre-Construction", value: pendingWO },
    { name: "Completed", value: sites.filter(s=>s.status==="Completed").length },
  ].filter(s=>s.value>0);

  // ── Tooltip ──
  const Tooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={t.chartTooltip} className="p-3 rounded-xl shadow-xl min-w-[120px]">
        <p className="font-black text-[10px] uppercase tracking-widest mb-2 opacity-70">{label}</p>
        {payload.map((e,i) => (
          <p key={i} className="text-xs font-bold flex items-center gap-2" style={{color:e.color}}>
            <span className="w-2 h-2 rounded-full inline-block" style={{background:e.color}}/>
            {e.name}: {typeof e.value==='number' ? fmt(e.value) : e.value}
          </p>
        ))}
      </div>
    );
  };

  const fade = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{type:"spring",stiffness:90}} };
  const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.08}} };

  // ── KPI Card component ──
  const KpiCard = ({ label, value, icon: Icon, color, sub }) => (
    <motion.div variants={fade}
      className={`relative overflow-hidden rounded-2xl p-5 ${t.card} ${t.cardHover} flex flex-col gap-3 border border-[var(--border-color)]`}
      style={{
        background: d ? `linear-gradient(135deg, var(--bg-card), rgba(0,0,0,0.2))` : `linear-gradient(135deg, white, #f8f9fc)`
      }}>
      {/* icon watermark */}
      <div className="absolute -right-3 -top-3 opacity-[0.06]"><Icon size={72} style={{color}}/></div>
      <div className="flex items-center gap-2">
        <span className="p-2 rounded-xl shadow-sm border border-black/5 dark:border-white/5" style={{background: color+'22'}}>
          <Icon size={14} style={{color}}/>
        </span>
        <p className={t.label}>{label}</p>
      </div>
      <p className="text-2xl font-black tracking-tight" style={{color}}>{value}</p>
      {sub && <p className={`${t.muted} -mt-1`}>{sub}</p>}
    </motion.div>
  );

  if (loading) return (
    <div className={`p-6 min-h-screen ${t.page} flex items-center justify-center`}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{borderColor:`${accentMain}33`, borderTopColor:accentMain}}/>
    </div>
  );

  return (
    <div className={`p-4 md:p-6 ${t.page}`}>

      {/* ── Header ── */}
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-7 gap-4 relative z-50">
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${d?"text-white":"text-[#1C2B4B]"}`}>
            Executive Dashboard
          </h1>
          <p className={`${t.muted} mt-0.5 uppercase tracking-widest`}>Real-time Business Intelligence</p>
        </div>

        {/* Date filter pill */}
        <div className={`${t.card} rounded-2xl px-3 py-2 flex flex-wrap items-center gap-3`}>
          <div className="flex flex-col relative">
            <span className={`${t.label} mb-0.5`}>Period</span>
            <div className="flex items-center gap-1">
              <select value={activePreset} onChange={handlePresetChange}
                className={`text-xs font-black bg-transparent outline-none cursor-pointer w-28 appearance-none ${d?"text-slate-200":"text-[#1C2B4B]"}`}>
                <option value="custom">Custom</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="financial_year">Financial Year</option>
              </select>
              <ChevronDown size={12} className="opacity-40"/>
            </div>
          </div>
          <div className={`hidden sm:block w-px h-5 ${t.divider}`}/>
          <input type="date" value={dateFrom} max={dateTo} onChange={e=>handleDateChange("from",e.target.value)}
            className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${d?"text-slate-200":"text-[#1C2B4B]"}`}/>
          <span className={`text-xs font-black ${t.muted}`}>→</span>
          <input type="date" value={dateTo} min={dateFrom} onChange={e=>handleDateChange("to",e.target.value)}
            className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${d?"text-slate-200":"text-[#1C2B4B]"}`}/>
          <NotificationWidget/>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

        {/* ── Row 1: Primary Financial KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Income" value={fmt(totalIncome)} icon={TrendingUp} color={incomeColor}
            sub={`${receipts.filter(r=>inRange(r.date)).length} receipts`}/>
          <KpiCard label="Total Spent" value={fmt(totalSpent)} icon={TrendingDown} color={expenseColor}
            sub={`${expenses.filter(e=>inRange(e.date)).length} entries`}/>
          <KpiCard label="Work Order Revenue" value={fmt(totalWOValue)} icon={Building} color={accentMain}
            sub={`${sites.length} total projects`}/>
          <motion.div variants={fade}
            className={`relative overflow-hidden rounded-2xl p-5 ${t.card} ${t.cardHover} flex flex-col gap-3`}
            style={{borderLeft:`3px solid ${profitPositive?incomeColor:expenseColor}`}}>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl shadow-sm border border-black/5 dark:border-white/5" style={{background:(profitPositive?incomeColor:expenseColor)+'22'}}>
                <IndianRupee size={14} style={{color:profitPositive?incomeColor:expenseColor}}/>
              </span>
              <p className={t.label}>Net Profit / Loss</p>
            </div>
            <p className="text-2xl font-black tracking-tight drop-shadow-sm" style={{color:profitPositive?incomeColor:expenseColor}}>
              {profitPositive?'+':''}{fmt(netProfit)}
            </p>
            <p className={t.muted}>Income minus expenses</p>
          </motion.div>
        </div>

        {/* ── Row 2: Operations KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Pending Quotations" value={pendingQuotes} icon={FileText} color={d?"#fb923c":"#C9A227"}/>
          <KpiCard label="In-Process Sites" value={inProcessSites} icon={HardHat} color={d?"#8b5cf6":"#3D5A8A"}/>
          <KpiCard label="Pending Work Orders" value={pendingWO} icon={ClipboardCheck} color={d?"#38bdf8":"#0ea5e9"}/>
          <KpiCard label="Total Payroll" value={fmt(totalPayroll)} icon={Banknote} color={d?"#a78bfa":"#6366f1"}/>
          <KpiCard label="Total Advances" value={fmt(totalAdvances)} icon={Wallet} color={d?"#f472b6":"#ec4899"}/>
          <KpiCard label="Present Today" value={`${presentToday} staff`} icon={CalendarCheck} color={incomeColor}/>
        </div>

        {/* ── Row 3: Charts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Cash Flow – 8 cols */}
          <motion.div variants={fade} className={`xl:col-span-8 ${t.card} rounded-2xl p-6`}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className={`font-black text-base ${d?"text-white":"text-[#1C2B4B]"}`}>Financial Trajectory</h3>
                <p className={`${t.muted} mt-0.5`}>Income vs Expenses — last 6 months</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block" style={{background:incomeColor}}/>Income</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block" style={{background:expenseColor}}/>Expenses</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{top:4,right:4,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={incomeColor} stopOpacity={d?0.3:0.15}/>
                      <stop offset="95%" stopColor={incomeColor} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={expenseColor} stopOpacity={d?0.3:0.15}/>
                      <stop offset="95%" stopColor={expenseColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.chartGrid}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{fontSize:10,fontWeight:700,fill:t.chartTickColor}} dy={8}/>
                  <YAxis axisLine={false} tickLine={false}
                    tick={{fontSize:10,fontWeight:700,fill:t.chartTickColor}}
                    tickFormatter={v=>`₹${v>=1000?Math.round(v/1000)+'k':v}`} width={48}/>
                  <RechartsTooltip content={<Tooltip/>}/>
                  <Area type="monotone" dataKey="Income" stroke={incomeColor} strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gIncome)"/>
                  <Area type="monotone" dataKey="Expenses" stroke={expenseColor} strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gExpense)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Site Status donut – 4 cols */}
          <motion.div variants={fade} className={`xl:col-span-4 ${t.card} rounded-2xl p-6 flex flex-col`}>
            <h3 className={`font-black text-base mb-1 ${d?"text-white":"text-[#1C2B4B]"}`}>Site Status</h3>
            <p className={`${t.muted} mb-4`}>Work order breakdown</p>
            <div className="flex-1 min-h-[180px] relative">
              {siteStatusData.length > 0 ? (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <span className={t.label}>Total</span>
                    <span className={`text-xl font-black ${d?"text-white":"text-[#1C2B4B]"}`}>{sites.length}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={siteStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                        paddingAngle={4} dataKey="value" stroke="none">
                        {siteStatusData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <RechartsTooltip content={<Tooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${t.muted} font-bold`}>No site data</div>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {siteStatusData.map((s,i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                    <span className={`text-xs font-semibold ${d?"text-slate-300":"text-[#3D5A8A]"}`}>{s.name}</span>
                  </div>
                  <span className={`text-xs font-black ${d?"text-white":"text-[#1C2B4B]"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Row 4: Expense breakdown + Quick Actions ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Expense bar chart – 8 cols */}
          <motion.div variants={fade} className={`xl:col-span-8 ${t.card} rounded-2xl p-6`}>
            <h3 className={`font-black text-base mb-1 ${d?"text-white":"text-[#1C2B4B]"}`}>Expense Categories</h3>
            <p className={`${t.muted} mb-5`}>Breakdown by classification (current period)</p>
            {expenseBreakdown.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown} layout="vertical"
                    margin={{top:0,right:16,left:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={t.chartGrid}/>
                    <XAxis type="number" hide tickFormatter={v=>`₹${v>=1000?Math.round(v/1000)+'k':v}`}/>
                    <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false}
                      tick={{fontSize:10,fontWeight:700,fill:t.chartTickColor}}/>
                    <RechartsTooltip content={<Tooltip/>}/>
                    <Bar dataKey="value" radius={[0,6,6,0]} barSize={18} name="Amount">
                      {expenseBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={`h-48 flex items-center justify-center ${t.muted} font-bold`}>No expense data for period</div>
            )}
          </motion.div>

          {/* Quick Actions – 4 cols */}
          <motion.div variants={fade} className="xl:col-span-4 flex flex-col gap-3">
            <h3 className={`font-black text-base ${d?"text-white":"text-[#1C2B4B]"}`}>Quick Actions</h3>
            {[
              { label:"New Quotation",  sub:"Create & send",       path:"/quotations", color: d?"#8b5cf6":"#C9A227" },
              { label:"New Receipt",    sub:"Log a payment",       path:"/receipts",   color: incomeColor },
              { label:"Log Expense",    sub:"Record a spend",      path:"/expenses",   color: expenseColor },
              { label:"Add Staff",      sub:"HR management",       path:"/employees",  color: accentSecond },
              { label:"Work Orders",    sub:"View all projects",   path:"/sites",      color: d?"#fb923c":"#6366f1" },
            ].map((btn,i) => (
              <motion.button key={i} variants={fade} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                onClick={()=>navigate(btn.path)}
                className={`w-full text-left p-3.5 rounded-xl flex items-center justify-between group transition-all ${t.card} ${t.cardHover}`}
                style={{borderLeft:`3px solid ${btn.color}`}}>
                <div>
                  <p className={`font-black text-xs ${d?"text-white":"text-[#1C2B4B]"}`}>{btn.label}</p>
                  <p className={t.muted}>{btn.sub}</p>
                </div>
                <ArrowRight size={14} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{color:btn.color}}/>
              </motion.button>
            ))}
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
};

export default Dashboard;
