import React, { useState, useEffect, useRef } from "react";
import { Bell, Activity, Clock, Wrench, X, CheckCircle2, Info } from "lucide-react";
import { useThemeClasses } from "../hooks/useThemeClasses";

const defaultNotifications = {
  reminders: [],
  maintenance: []
};

export default function NotificationWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reminders");
  const [notifications, setNotifications] = useState(defaultNotifications);
  const dropdownRef = useRef(null);
  const t = useThemeClasses();

  const fetchActivitiesAndSites = async () => {
    try {
      const [crmRes, sitesRes] = await Promise.all([
        fetch('/api/crm/activities/all'),
        fetch('/api/sites')
      ]);
      
      let reminders = [];
      let maintenance = [];

      if (crmRes.ok) {
        const data = await crmRes.json();
        reminders = data.map(act => {
          const actDate = new Date(act.date || new Date());
          const isPast = actDate < new Date() && act.status !== 'Completed';
          return {
            id: act.id,
            title: act.type || "CRM Activity",
            time: actDate.toLocaleString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            type: isPast ? "warning" : "info",
            isRead: act.status === 'Completed',
          };
        });
      }

      if (sitesRes.ok) {
        const data = await sitesRes.json();
        data.forEach(site => {
          if (site.maintenance && site.maintenance.required && site.maintenance.nextDue) {
            const dueDate = new Date(site.maintenance.nextDue);
            const isPast = dueDate < new Date();
            maintenance.push({
              id: `maint-${site.id}`,
              title: `${site.name} - ${site.maintenance.frequency} Maintenance`,
              time: `Due: ${dueDate.toLocaleDateString('en-GB')}`,
              type: isPast ? "warning" : "info",
              isRead: false
            });
          }
        });
      }

      setNotifications({ reminders, maintenance });
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchActivitiesAndSites();
    // Refresh periodically or on focus could be added here
  }, []);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = updated[key].map(n => ({ ...n, isRead: true }));
      });
      return updated;
    });
  };

  const getUnreadCount = () => {
    let count = 0;
    Object.values(notifications).forEach(list => {
      count += list.filter(n => !n.isRead).length;
    });
    return count;
  };

  const unreadCount = getUnreadCount();

  const renderIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "warning": return <Clock size={16} className="text-amber-500" />;
      default: return <Info size={16} className="text-indigo-500" />;
    }
  };

  return (
    <div className="fixed top-4 right-6 z-50" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={toggleOpen}
        className={`relative p-2.5 rounded-xl transition-all duration-300 shadow-sm ${t.isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
      >
        <Bell size={20} className={isOpen ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-[var(--bg-surface)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 mt-3 w-80 md:w-96 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 origin-top-right border ${t.isDark ? 'bg-slate-900/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-slate-200'}`}>
          {/* Header */}
          <div className={`p-4 border-b flex justify-between items-center ${t.isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
            <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                  {unreadCount} New
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-wider">
                Mark all read
              </button>
              <button onClick={() => setIsOpen(false)} className={`p-1 rounded-full ${t.isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${t.isDark ? 'border-white/10' : 'border-slate-200'} px-2 pt-2 gap-1`}>
            {[
              { id: 'reminders', label: 'Reminders', icon: Clock },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench }
            ].map(tab => {
               const isActive = activeTab === tab.id;
               const hasUnread = notifications[tab.id].some(n => !n.isRead);
               return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 text-xs font-bold rounded-t-xl transition-all relative ${isActive ? (t.isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800') : (t.isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}`}
                >
                  <tab.icon size={14} />
                  <span className="hidden md:inline">{tab.label}</span>
                  {hasUnread && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />}
                </button>
               );
            })}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto no-scrollbar p-2">
            {notifications[activeTab].length > 0 ? (
              <div className="flex flex-col gap-1">
                {notifications[activeTab].map(notification => (
                  <div key={notification.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${!notification.isRead ? (t.isDark ? 'bg-indigo-500/10' : 'bg-indigo-50') : 'hover:bg-white/5'} cursor-pointer`}>
                    <div className="mt-0.5">
                      {renderIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${!notification.isRead ? (t.isDark ? 'text-white' : 'text-slate-900') : (t.isDark ? 'text-slate-300' : 'text-slate-600')}`}>
                        {notification.title}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <Bell size={24} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">No new notifications</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className={`p-3 border-t text-center ${t.isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
            <button className="text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
