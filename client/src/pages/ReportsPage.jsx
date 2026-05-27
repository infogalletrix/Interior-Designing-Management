import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, FileSpreadsheet, Download, 
  TrendingUp, TrendingDown, Users, Building, PieChart as PieChartIcon, Activity
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useDialog } from "../contexts/DialogContext";
import { useThemeClasses } from "../hooks/useThemeClasses";
import NotificationWidget from "../components/NotificationWidget";

const DARK_COLORS  = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899'];
const LIGHT_COLORS = ['#f97316', '#10b981', '#eab308', '#ef4444', '#3b82f6', '#ec4899'];

const ReportsPage = () => {
  const { showDialog } = useDialog();
  const t = useThemeClasses();
  const COLORS = t.isDark ? DARK_COLORS : LIGHT_COLORS;

  const [selectedReport, setSelectedReport] = useState("invoices");
  const [dashboardData, setDashboardData] = useState({ accounts: [], crm: [], sites: [], loading: true });
  const [viewReportData, setViewReportData] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const [accRes, crmRes, sitesRes] = await Promise.all([
          fetch('/api/finance/accounts'),
          fetch('/api/crm'),
          fetch('/api/sites')
        ]);
        const accounts = await accRes.json();
        const crm = await crmRes.json();
        const sites = await sitesRes.json();
        setDashboardData({ accounts, crm, sites, loading: false });
      } catch (err) {
        console.error("Failed to load insights", err);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchInsights();
  }, []);

  const { totalInflow, totalOutflow, activeProjects, totalLeads, leadSources, cashflowTrend } = useMemo(() => {
    let inflow = 0, outflow = 0;
    dashboardData.accounts.forEach(a => {
      if (a.type.toLowerCase() === 'credit') inflow += a.amount;
      else if (a.type.toLowerCase() === 'debit') outflow += a.amount;
    });
    const activeProjectsCount = dashboardData.sites.filter(s => s.status !== 'Completed').length;
    const leadsCount = dashboardData.crm.length;
    const sourcesMap = {};
    dashboardData.crm.forEach(c => { const s = c.source || 'Other'; sourcesMap[s] = (sourcesMap[s] || 0) + 1; });
    const sources = Object.keys(sourcesMap).map(k => ({ name: k, value: sourcesMap[k] }));
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const currentMonthIndex = new Date().getMonth();
    const trendMap = {};
    for (let i = 5; i >= 0; i--) {
      let d = new Date(); d.setMonth(currentMonthIndex - i);
      trendMap[`${months[d.getMonth()]} ${d.getFullYear()}`] = { name: months[d.getMonth()], inflow: 0, outflow: 0, sortDate: new Date(d.getFullYear(), d.getMonth(), 1) };
    }
    dashboardData.accounts.forEach(a => {
      const d = new Date(a.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (trendMap[key]) {
        if (a.type.toLowerCase() === 'credit') trendMap[key].inflow += a.amount;
        else if (a.type.toLowerCase() === 'debit') trendMap[key].outflow += a.amount;
      }
    });
    const trend = Object.values(trendMap).sort((a,b) => a.sortDate - b.sortDate);
    return { totalInflow: inflow, totalOutflow: outflow, activeProjects: activeProjectsCount, totalLeads: leadsCount, leadSources: sources, cashflowTrend: trend };
  }, [dashboardData]);

  const fetchReportData = async (reportId) => {
    let header = [], rows = [], title = "Report";
    try {
      switch(reportId) {
        case 'employees': { const d = await (await fetch('/api/employees')).json(); title="Staff Directory"; header=["ID","Name","Role","Phone","Salary Type","Salary","Status"]; rows=d.map(e=>[e.workerId,e.name,e.role,e.phone,e.salaryType,e.salary,e.status]); break; }
        case 'advance': { let d = await (await fetch('/api/employees')).json(); d=d.filter(e=>e.advanceBalance>0); title="Advance Salary Balances"; header=["ID","Name","Role","Advance Balance"]; rows=d.map(e=>[e.workerId,e.name,e.role,e.advanceBalance]); break; }
        case 'salary': { const d = await (await fetch('/api/finance/payroll')).json(); title="Salary Disbursal History"; header=["Date","Employee ID","Status","Amount","Month","Year"]; d.forEach(p=>rows.push([p.paidDate||p.month+' '+p.year,`EMP-${p.employeeId}`,p.status,p.netPay,p.month,p.year])); rows.sort((a,b)=>new Date(b[0])-new Date(a[0])); break; }
        case 'expenses': { const d = await (await fetch('/api/finance/expenses')).json(); title="Expense Register"; header=["Date","Type","Category/Client","Description","Amount"]; rows=d.map(e=>[new Date(e.date).toLocaleDateString('en-IN'),e.type,e.clientId||e.category,e.description,e.amount]); break; }
        case 'invoices': { const d = await (await fetch('/api/finance/invoices')).json(); title="Invoice Register"; header=["Date","Invoice No","Client","Total","Status"]; rows=d.map(e=>[new Date(e.date).toLocaleDateString('en-IN'),e.invoiceNo,e.clientName,e.total,e.status||"Paid"]); break; }
        case 'quotations': { const d = await (await fetch('/api/quotations')).json(); title="Quotation Register"; header=["Date","Quote ID","Client","Total","Status"]; rows=d.map(e=>[new Date(e.date).toLocaleDateString('en-IN'),`QT-${e.id}`,e.clientName,e.total,e.status||"Pending"]); break; }
        case 'accounts': { const d = await (await fetch('/api/finance/accounts')).json(); title="Account Ledger"; header=["Date","Type","Category","Description","Amount"]; rows=d.map(e=>[new Date(e.date).toLocaleDateString('en-IN'),e.type.toUpperCase(),e.category||"-",e.description,e.amount]); break; }
        case 'sites': { const d = await (await fetch('/api/sites')).json(); title="Project Sites Register"; header=["Site Name","Client","Location","Budget","Status","Completion %"]; rows=d.map(e=>[e.name,e.clientName,e.address,e.budget,e.status,`${e.completion||0}%`]); break; }
        case 'clients': { const d = await (await fetch('/api/crm')).json(); title="Client Directory"; header=["Name","Phone","Email","Status","Source"]; rows=d.map(e=>[e.name,e.phone,e.email||"-",e.status,e.source||"Unknown"]); break; }
        case 'growth': {
          const crmData = await (await fetch('/api/crm')).json();
          title="Sales & Growth Report"; header=["Month","Total Leads","Converted","Conversion Rate"];
          const monthly = {};
          crmData.forEach(lead => { const d=new Date(lead.date||Date.now()); const month=d.toISOString().slice(0,7); if(!monthly[month]) monthly[month]={total:0,converted:0}; monthly[month].total++; if(lead.status==="Converted") monthly[month].converted++; });
          Object.keys(monthly).sort().reverse().forEach(m => { const rate=((monthly[m].converted/monthly[m].total)*100).toFixed(1)+"%"; rows.push([m,monthly[m].total,monthly[m].converted,rate]); });
          break;
        }
        default: break;
      }
    } catch (err) { console.error(err); showDialog({ title: "Error", message: "Failed to fetch data for report.", type: "error" }); }
    return { title, header, rows: rows.map(r => r.map(c => c != null ? String(c) : "-")) };
  };

  const viewReport = async () => {
    const data = await fetchReportData(selectedReport);
    if(data.rows.length === 0) { showDialog({ title: "No Data", message: "No data available for this report.", type: "alert" }); return; }
    setViewReportData(data);
  };

  const exportPDF = async () => {
    try {
      const { title, header, rows } = await fetchReportData(selectedReport);
      if(rows.length === 0) { showDialog({ title: "No Data", message: "No data available for this report.", type: "alert" }); return; }
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(title, 14, 22);
      doc.setFontSize(11); doc.setTextColor(100); doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
      autoTable(doc, { startY: 35, head: [header], body: rows, theme: 'grid', headStyles: { fillColor: t.isDark ? [79,70,229] : [249,115,22] } });
      doc.save(`${title.replace(/\s+/g,'_')}_${Date.now()}.pdf`);
    } catch (err) { showDialog({ title: "Export Error", message: "PDF Export Error: " + err.message, type: "error" }); }
  };

  const exportExcel = async () => {
    try {
      const { title, header, rows } = await fetchReportData(selectedReport);
      if(rows.length === 0) { showDialog({ title: "No Data", message: "No data available for this report.", type: "alert" }); return; }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Report Data");
      XLSX.writeFile(wb, `${title.replace(/\s+/g,'_')}_${Date.now()}.xlsx`);
    } catch (err) { showDialog({ title: "Export Error", message: "Excel Export Error: " + err.message, type: "error" }); }
  };

  const reportOptions = [
    { group: "HR & Payroll", options: [{id:"employees",label:"Staff Directory"},{id:"salary",label:"Salary History"},{id:"advance",label:"Advance Salaries"}] },
    { group: "Financial Reports", options: [{id:"accounts",label:"Accounts Ledger"},{id:"expenses",label:"Expense Register"},{id:"invoices",label:"Invoice History"},{id:"quotations",label:"Quotations Sent"}] },
    { group: "Projects & CRM", options: [{id:"sites",label:"Sites History"},{id:"clients",label:"Client Directory"},{id:"growth",label:"Growth Metrics"}] },
  ];

  const generatorPanel = t.isDark
    ? "themed-card border border-[var(--border-color)]"
    : "bg-[var(--accent)] text-white";

  return (
    <div className={`p-4 md:p-6 ${t.page}`}>

      {/* HEADER */}
      <div className="relative z-50 mb-6 flex justify-between items-start">
        <div>
          <motion.h1 initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
            className={`text-xl font-black tracking-tight flex items-center gap-2 ${t.heading}`}>
            <Activity className={t.isDark ? "text-violet-400" : "text-[#D4AF37]"} size={20} />
            Reports &amp; Insights
          </motion.h1>
          <p className={`mt-0.5 text-xs font-medium ${t.muted}`}>
            Generate comprehensive reports and monitor real-time business metrics.
          </p>
        </div>
        <NotificationWidget />
      </div>

      {!dashboardData.loading && (
        <div className="relative z-10">
          {/* KPI ROW */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label:"Total Inflow", value:`₹${(totalInflow/100000).toFixed(2)}L`, icon:TrendingUp, color: t.isDark ? "text-emerald-400" : "text-emerald-600" },
              { label:"Total Outflow", value:`₹${(totalOutflow/100000).toFixed(2)}L`, icon:TrendingDown, color: t.isDark ? "text-rose-400" : "text-rose-600" },
              { label:"CRM Leads", value:totalLeads, icon:Users, color: t.isDark ? "text-blue-400" : "text-blue-600" },
              { label:"Active Projects", value:activeProjects, icon:Building, color: t.isDark ? "text-violet-400" : "text-[#D4AF37]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`${t.card} ${t.cardHover} p-6 rounded-[2rem]`}>
                <h3 className={`${t.label} mb-2 flex items-center gap-2`}>
                  <Icon size={14} className={color} /> {label}
                </h3>
                <div className={`text-3xl font-black ${t.heading}`}>{value}</div>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CHARTS — LEFT 2 COLS */}
            <div className="xl:col-span-2 space-y-6">
              {/* Cashflow Chart */}
              <div className={`${t.card} rounded-[2rem] p-6 lg:p-8`}>
                <h3 className={`text-sm font-black mb-6 flex items-center gap-2 uppercase tracking-widest ${t.heading}`}>
                  <Activity size={16} className={t.isDark ? "text-violet-400" : "text-[#D4AF37]"}/> Cashflow Overview (6 Months)
                </h3>
                <ResponsiveContainer width="100%" height={250} minWidth={1}>
                  <BarChart data={cashflowTrend} margin={{ top:5, right:10, left:0, bottom:5 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.chartGrid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:t.chartTickColor }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fontWeight:700, fill:t.chartTickColor }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <RechartsTooltip cursor={{ fill: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(253,216,53,0.1)' }} contentStyle={t.chartTooltip} />
                    <Bar dataKey="inflow" name="Cash Inflow" fill={t.isDark ? "#10b981" : "#16a34a"} radius={[4,4,0,0]} />
                    <Bar dataKey="outflow" name="Cash Outflow" fill={t.isDark ? "#f43f5e" : "#ef4444"} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lead Sources Pie */}
              <div className={`${t.card} rounded-[2rem] p-6 lg:p-8`}>
                <h3 className={`text-sm font-black mb-6 flex items-center gap-2 uppercase tracking-widest ${t.heading}`}>
                  <PieChartIcon size={16} className={t.isDark ? "text-violet-400" : "text-[#D4AF37]"}/> CRM Lead Sources
                </h3>
                <ResponsiveContainer width="100%" height={250} minWidth={1}>
                  <PieChart>
                    <Pie data={leadSources} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                      {leadSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={t.chartTooltip} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"
                      wrapperStyle={{ fontSize:'11px', fontWeight:700, color: t.chartTickColor }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* REPORT GENERATOR — RIGHT COL */}
            <div className="xl:col-span-1">
              <div className={`${generatorPanel} rounded-[2rem] p-6 lg:p-8 shadow-xl sticky top-8 relative overflow-hidden`}>
                <div className="absolute -right-4 -bottom-4 opacity-10"><FileText size={150} /></div>
                <h3 className="text-xl font-black mb-2 flex items-center gap-2 tracking-tight text-white">Report Generator</h3>
                <p className="text-xs font-medium mb-8 text-white/70">Select a dataset to compile into a downloadable document.</p>

                <div className="space-y-6 relative z-10">
                  <div>
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2 block">Select Dataset</label>
                    <select
                      className={`w-full rounded-xl p-3 text-sm font-bold outline-none transition-all cursor-pointer appearance-none ${
                        t.isDark
                          ? "bg-slate-800/80 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-900"
                          : "bg-white/20 border border-white/30 text-white focus:ring-2 focus:ring-white/50 [&>option]:bg-orange-600 [&>option]:text-white"
                      }`}
                      value={selectedReport}
                      onChange={(e) => setSelectedReport(e.target.value)}
                    >
                      {reportOptions.map((group, idx) => (
                        <optgroup key={idx} label={group.group}>
                          {group.options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-white/20 space-y-3">
                    <button onClick={viewReport}
                      className="w-full flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3.5 rounded-xl font-black text-sm transition-all">
                      <FileText size={16}/> View Report
                    </button>
                    <button onClick={exportPDF}
                      className="w-full flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3.5 rounded-xl font-black text-sm transition-all">
                      <Download size={16}/> Download as PDF
                    </button>
                    <button onClick={exportExcel}
                      className="w-full flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3.5 rounded-xl font-black text-sm transition-all">
                      <FileSpreadsheet size={16}/> Download as Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REPORT MODAL */}
      {viewReportData && (
        <div className={`fixed inset-0 ${t.modalOverlay} z-50 flex items-center justify-center p-4`}>
          <div className={`${t.modalBg} rounded-[2rem] w-full max-w-5xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden`}>
            <div className={`p-6 ${t.modalHeader} flex justify-between items-center`}>
              <h2 className={`text-2xl font-black ${t.heading}`}>{viewReportData.title}</h2>
              <button onClick={() => setViewReportData(null)}
                className={`text-3xl leading-none transition-colors ${t.isDark ? "text-slate-400 hover:text-rose-400" : "text-amber-700 hover:text-red-600"}`}>
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead className={`${t.tableHead} sticky top-0 shadow-sm`}>
                  <tr>
                    {viewReportData.header.map((h,i) => <th key={i} className="p-4">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {viewReportData.rows.map((row,i) => (
                    <tr key={i} className={t.tableRow}>
                      {row.map((cell,j) => <td key={j} className={`p-4 text-sm ${t.tableCell}`}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`p-4 ${t.modalHeader} flex justify-end gap-3`}>
              <button onClick={exportPDF}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${t.btnDanger}`}>
                <Download size={16}/> Download PDF
              </button>
              <button onClick={exportExcel}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${t.isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"}`}>
                <FileSpreadsheet size={16}/> Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
