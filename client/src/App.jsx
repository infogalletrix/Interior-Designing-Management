import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import CRMPage from "./pages/CRMPage";
import BillingPage from "./pages/BillingPage";
import InvoicesPage from "./pages/InvoicesPage";
import QuotationPage from "./pages/QuotationPage";
import ExpensePage from "./pages/ExpensePage";
import SitesPage from "./pages/SitesPage";
import AccountsPage from "./pages/AccountsPage";
import EmployeesPage from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import SalaryPage from "./pages/SalaryPage";
import ReportsPage from "./pages/ReportsPage";
import ReceiptPage from "./pages/ReceiptPage";
import { DialogProvider } from "./contexts/DialogContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <ThemeProvider>
      <DialogProvider>
        <Router>
          <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
            <Sidebar
              isOpen={isSidebarOpen}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/crm" element={<CRMPage />} />
                <Route path="/quotations" element={<QuotationPage />} />

                {/* Finance */}
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/receipts" element={<ReceiptPage />} />

                {/* Projects */}
                <Route path="/sites" element={<SitesPage />} />

                {/* HR */}
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/salary" element={<SalaryPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;
