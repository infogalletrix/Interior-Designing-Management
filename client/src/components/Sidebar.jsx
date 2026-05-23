import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Briefcase,
  BarChart2,
  Menu,
  ChevronLeft,
  Wallet,
  MapPin,
  Receipt,
  Landmark,
  CheckSquare,
  FileStack,
  IndianRupee,
  Plus,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeClasses } from "../hooks/useThemeClasses";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const t = useThemeClasses();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === "s") toggleSidebar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const menuItems = [
    { path: "/", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/crm", name: "CRM", icon: <Users size={20} /> },
    {
      path: "/quotations",
      name: "Quotations",
      icon: <ClipboardList size={20} />,
      canAdd: true,
    },

    { type: "header", name: "FINANCE" },
    {
      path: "/billing",
      name: "Billing",
      icon: <FileText size={20} />,
      canAdd: true,
    },
    { path: "/invoices", name: "History", icon: <FileStack size={20} /> },
    {
      path: "/receipts",
      name: "Payment Receipts",
      icon: <Receipt size={20} />,
    },
    { path: "/expenses", name: "Expenses & credits", icon: <Receipt size={20} /> },
    { path: "/accounts", name: "Accounts", icon: <Landmark size={20} /> },

    { type: "header", name: "PROJECTS" },
    { path: "/sites", name: "Work Orders", icon: <MapPin size={20} /> },

    { type: "header", name: "HUMAN RESOURCES" },
    { path: "/employees", name: "Employees", icon: <Briefcase size={20} /> },
    { path: "/attendance", name: "Attendance", icon: <MapPin size={20} /> },
    { path: "/salary", name: "Payroll", icon: <Wallet size={20} /> },
    { path: "/reports", name: "Reports", icon: <BarChart2 size={20} /> },
  ];

  return (
    <nav
      className={`${
        isOpen ? "w-64" : "w-20"
      } ${ t.isDark
        ? "bg-slate-900/80 backdrop-blur-xl border-r border-white/10 text-slate-200"
        : "bg-[#fff8ed] border-r border-amber-200 text-[#1c1009]"
      } flex flex-col h-screen transition-all duration-300 relative shadow-2xl flex-shrink-0 z-20`}
    >
      {/* Header */}
      <div
        onClick={toggleSidebar}
        className={`py-5 px-4 flex items-center cursor-pointer group transition ${ t.isDark ? "hover:bg-white/5 border-b border-white/10" : "hover:bg-amber-100 border-b border-amber-200"}`}
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <div className={`flex items-center gap-3 ${!isOpen ? "justify-center w-full" : ""}`}>
          <div className={`flex-shrink-0 ${ t.isDark ? "text-violet-400" : "text-orange-500"}`}>
            {isOpen ? <ChevronLeft size={22} /> : <Menu size={22} />}
          </div>
          {isOpen && (
            <div>
              <h2 className={`text-base font-black whitespace-nowrap leading-tight ${ t.isDark ? "bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent" : "text-orange-600"}`}>
                Mona Interior
              </h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${ t.isDark ? "text-slate-500" : "text-amber-700"}`}>
                Studio CRM
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ul className="space-y-0.5 flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        {menuItems.map((item, index) => {
          if (item.type === "header") {
            return isOpen ? (
              <li key={index} className="px-3 pt-5 pb-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${ t.isDark ? "text-slate-600" : "text-amber-400"}`}>
                  {item.name}
                </span>
              </li>
            ) : (
              <li key={index} className={`h-px my-3 mx-2 ${ t.isDark ? "bg-white/10" : "bg-amber-200"}`} />
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="relative group/nav-item">
              <Link
                to={item.path}
                title={!isOpen ? item.name : ""}
                className={`flex items-center ${
                  isOpen ? "justify-start gap-3 px-3" : "justify-center px-2"
                } py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? t.isDark
                      ? "bg-violet-600/80 text-white shadow-lg shadow-violet-900/40"
                      : "bg-orange-500 text-white shadow-lg shadow-orange-200"
                    : t.isDark
                      ? "text-slate-400 hover:text-white hover:bg-white/5"
                      : "text-amber-800 hover:text-orange-600 hover:bg-amber-100"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && (
                  <span className="font-semibold whitespace-nowrap text-sm">
                    {item.name}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className={`p-4 flex flex-col items-center gap-2 border-t ${ t.isDark ? "border-white/10" : "border-amber-200"}`}>
        <button
          onClick={toggleTheme}
          className={`flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${ t.isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-amber-700 hover:text-orange-600 hover:bg-amber-100"} ${isOpen ? "w-full gap-3" : "w-10 h-10"}`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {isOpen && <span className="font-semibold text-sm">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        {isOpen && (
          <p className={`text-[10px] text-center font-bold uppercase tracking-widest mt-2 ${ t.isDark ? "text-slate-600" : "text-amber-400"}`}>
            © 2026 Mona Interior
          </p>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;
