import { useTheme } from "../contexts/ThemeContext";

/**
 * Returns a set of Tailwind class strings that implement the dual theme:
 *   Dark  — slate-950 glassmorphism with violet accents
 *   Light — ManForce ERP (dark navy sidebar, white bg, gold accents)
 */
export function useThemeClasses() {
  const { isDarkMode } = useTheme();
  const d = isDarkMode;

  return {
    isDark: d,

    // ── Page wrapper ────────────────────────────────────────────────
    page: d
      ? "bg-slate-950 text-slate-200 min-h-screen font-sans relative overflow-hidden"
      : "bg-[#F4F5F7] text-[#1C2B4B] min-h-screen font-sans relative overflow-hidden",

    // ── Ambient background orbs ─────────────────────────────────────
    orb1: d
      ? "absolute top-0 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none"
      : "hidden",
    orb2: d
      ? "absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"
      : "hidden",

    // ── Cards / panels ───────────────────────────────────────────────
    card: d
      ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
      : "bg-white border border-[#E1E4E8] shadow-sm",
    cardHover: d
      ? "hover:border-white/20 transition-all"
      : "hover:border-[#C9A227]/50 hover:shadow-md transition-all",
    cardAccent: d
      ? "bg-gradient-to-br from-violet-600/30 to-violet-900/30 border border-violet-500/30"
      : "bg-gradient-to-br from-[#FDF3D0] to-[#FFFDF9] border border-[#C9A227]/30",

    // ── Typography ──────────────────────────────────────────────────
    heading: d ? "text-white font-bold text-base" : "text-[#1C2B4B] font-bold text-base",
    subheading: d ? "text-slate-300 font-semibold text-sm" : "text-[#3D5A8A] font-semibold text-sm",
    muted: d ? "text-slate-400 text-xs" : "text-[#6B7C99] text-xs",
    label: d
      ? "text-[9px] font-bold text-slate-400 uppercase tracking-widest"
      : "text-[9px] font-bold text-[#6B7C99] uppercase tracking-widest",

    // ── Inputs ───────────────────────────────────────────────────────
    input: d
      ? "w-full p-2 border border-white/10 rounded-lg bg-black/20 outline-none focus:border-violet-500 focus:bg-black/40 text-white font-medium text-xs transition"
      : "w-full p-2 border border-[#E1E4E8] rounded-lg bg-white outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]/20 text-[#1C2B4B] font-medium text-xs transition",

    select: d
      ? "border border-white/10 rounded-lg bg-black/20 text-white outline-none focus:border-violet-500 [&>option]:bg-slate-900"
      : "border border-[#E1E4E8] rounded-lg bg-white text-[#1C2B4B] outline-none focus:border-[#C9A227] [&>option]:bg-white",

    // ── Buttons ──────────────────────────────────────────────────────
    btnPrimary: d
      ? "bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition shadow-[0_0_20px_rgba(139,92,246,0.3)]"
      : "bg-[#C9A227] hover:bg-[#B8911F] text-white font-bold text-xs rounded-lg transition shadow-sm",
    btnSecondary: d
      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs rounded-lg transition"
      : "bg-white hover:bg-[#F4F5F7] border border-[#E1E4E8] text-[#1C2B4B] font-semibold text-xs rounded-lg transition",
    btnDanger: d
      ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-semibold text-xs rounded-lg transition"
      : "bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-semibold text-xs rounded-lg transition",

    // ── Table ────────────────────────────────────────────────────────
    tableHead: d
      ? "bg-black/30 border-b border-white/10 text-slate-500 text-[9px] font-bold uppercase tracking-widest"
      : "bg-[#F4F5F7] border-b border-[#E1E4E8] text-[#6B7C99] text-[9px] font-bold uppercase tracking-widest",
    tableRow: d
      ? "border-b border-white/5 hover:bg-white/5 transition"
      : "border-b border-[#E1E4E8] hover:bg-[#F9FAFB] transition",
    tableCell: d ? "text-slate-200 font-medium text-xs" : "text-[#1C2B4B] font-medium text-xs",

    // ── Badges ───────────────────────────────────────────────────────
    badgeSuccess: d
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      : "bg-[#DCFCE7] text-[#166534] border border-emerald-100",
    badgeWarn: d
      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
      : "bg-[#FEF9C3] text-[#854d0e] border border-amber-100",
    badgeDanger: d
      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
      : "bg-[#FEE2E2] text-[#991b1b] border border-red-100",
    badgeNeutral: d
      ? "bg-slate-700/30 text-slate-300 border border-slate-600/30"
      : "bg-[#F1F5F9] text-[#475569] border border-slate-200",

    // ── Dividers ─────────────────────────────────────────────────────
    divider: d ? "bg-white/10" : "bg-[#E1E4E8]",
    borderClass: d ? "border-white/10" : "border-[#E1E4E8]",

    // ── Chart tooltip/grid ──────────────────────────────────────────
    chartGrid: d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    chartTooltip: d
      ? { borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#f1f5f9", fontSize: "11px" }
      : { borderRadius: "8px", border: "1px solid #E1E4E8", background: "#ffffff", color: "#1C2B4B", fontSize: "11px" },
    chartTickColor: d ? "#64748b" : "#6B7C99",

    // ── Modal ────────────────────────────────────────────────────────
    modalBg: d
      ? "bg-slate-900/95 border border-white/10 text-slate-200"
      : "bg-white border border-[#E1E4E8] text-[#1C2B4B]",
    modalOverlay: d ? "bg-black/60 backdrop-blur-sm" : "bg-[#1C2B4B]/30 backdrop-blur-sm",
    modalHeader: d ? "bg-black/20 border-b border-white/10" : "bg-[#F4F5F7] border-b border-[#E1E4E8]",

    // ── Section header (stat pills) ─────────────────────────────────
    statPill: d
      ? "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
      : "bg-white border border-[#E1E4E8] rounded-2xl p-4 shadow-sm",
  };
}
