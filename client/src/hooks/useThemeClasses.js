import { useTheme } from "../contexts/ThemeContext";

/**
 * Returns a set of Tailwind class strings that implement the dual theme:
 *   Dark  — slate-950 glassmorphism with violet accents
 *   Light — warm cream / amber / orange palette
 */
export function useThemeClasses() {
  const { isDarkMode } = useTheme();
  const d = isDarkMode;

  return {
    isDark: d,

    // ── Page wrapper ────────────────────────────────────────────────
    page: d
      ? "bg-slate-950 text-slate-200 min-h-screen font-sans relative overflow-hidden"
      : "bg-[#fdf8f0] text-[#1c1009] min-h-screen font-sans relative overflow-hidden",

    // ── Ambient background orbs ─────────────────────────────────────
    orb1: d
      ? "absolute top-0 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none"
      : "absolute top-0 left-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-[120px] pointer-events-none",
    orb2: d
      ? "absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"
      : "absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-[120px] pointer-events-none",

    // ── Cards / panels ───────────────────────────────────────────────
    card: d
      ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
      : "bg-white border border-amber-200/60 shadow-md",
    cardHover: d
      ? "hover:border-white/20 transition-all"
      : "hover:border-orange-300 hover:shadow-lg transition-all",
    cardAccent: d
      ? "bg-gradient-to-br from-violet-600/30 to-violet-900/30 border border-violet-500/30"
      : "bg-gradient-to-br from-orange-100 to-amber-50 border border-orange-200",

    // ── Typography ──────────────────────────────────────────────────
    heading: d ? "text-white font-black" : "text-[#1c1009] font-black",
    subheading: d ? "text-slate-300 font-bold" : "text-amber-900 font-bold",
    muted: d ? "text-slate-400" : "text-amber-700",
    label: d
      ? "text-[10px] font-black text-slate-400 uppercase tracking-widest"
      : "text-[10px] font-black text-amber-700 uppercase tracking-widest",

    // ── Inputs ───────────────────────────────────────────────────────
    input: d
      ? "w-full p-2.5 border border-white/10 rounded-xl bg-black/20 outline-none focus:border-violet-500 focus:bg-black/40 text-white font-bold text-sm transition"
      : "w-full p-2.5 border border-amber-200 rounded-xl bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-[#1c1009] font-bold text-sm transition",

    select: d
      ? "border border-white/10 rounded-xl bg-black/20 text-white outline-none focus:border-violet-500 [&>option]:bg-slate-900"
      : "border border-amber-200 rounded-xl bg-white text-[#1c1009] outline-none focus:border-orange-400 [&>option]:bg-white",

    // ── Buttons ──────────────────────────────────────────────────────
    btnPrimary: d
      ? "bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition shadow-[0_0_20px_rgba(139,92,246,0.3)]"
      : "bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl transition shadow-[0_0_20px_rgba(249,115,22,0.25)]",
    btnSecondary: d
      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold rounded-xl transition"
      : "bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold rounded-xl transition",
    btnDanger: d
      ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl transition"
      : "bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl transition",

    // ── Table ────────────────────────────────────────────────────────
    tableHead: d
      ? "bg-black/30 border-b border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest"
      : "bg-amber-50 border-b border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest",
    tableRow: d
      ? "border-b border-white/5 hover:bg-white/5 transition"
      : "border-b border-amber-100 hover:bg-amber-50/60 transition",
    tableCell: d ? "text-slate-200 font-bold" : "text-[#1c1009] font-bold",

    // ── Badges ───────────────────────────────────────────────────────
    badgeSuccess: d
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200",
    badgeWarn: d
      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
      : "bg-amber-50 text-amber-700 border border-amber-200",
    badgeDanger: d
      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
      : "bg-red-50 text-red-700 border border-red-200",
    badgeNeutral: d
      ? "bg-slate-700/30 text-slate-300 border border-slate-600/30"
      : "bg-gray-100 text-gray-600 border border-gray-200",

    // ── Dividers ─────────────────────────────────────────────────────
    divider: d ? "bg-white/10" : "bg-amber-200",
    borderClass: d ? "border-white/10" : "border-amber-200",

    // ── Chart tooltip/grid ──────────────────────────────────────────
    chartGrid: d ? "rgba(255,255,255,0.05)" : "#f5e9d0",
    chartTooltip: d
      ? { borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#f1f5f9" }
      : { borderRadius: "12px", border: "1px solid #fde68a", background: "#fff8ed", color: "#1c1009" },
    chartTickColor: d ? "#64748b" : "#92400e",

    // ── Modal ────────────────────────────────────────────────────────
    modalBg: d
      ? "bg-slate-900/95 border border-white/10 text-slate-200"
      : "bg-white border border-amber-200 text-[#1c1009]",
    modalOverlay: d ? "bg-black/60 backdrop-blur-sm" : "bg-amber-900/20 backdrop-blur-sm",
    modalHeader: d ? "bg-black/20 border-b border-white/10" : "bg-amber-50 border-b border-amber-200",

    // ── Section header (stat pills) ─────────────────────────────────
    statPill: d
      ? "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5"
      : "bg-white border border-amber-200 rounded-3xl p-5 shadow-sm",
  };
}
