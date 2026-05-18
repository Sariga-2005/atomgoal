import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  LayoutDashboard, Target, CheckSquare, Users, Settings, LogOut,
  Activity, BarChart3, Share2, Bell, ChevronDown, Database,
  AlertTriangle, ShieldCheck, User as UserIcon, Sparkles, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocalNotification {
  id: string;
  message: string;
  read: boolean;
  time: string;
  type: "info" | "success" | "warning";
}

export default function DashboardLayout() {
  const { user, logout, connectionStatus } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);

  // Contextual notification seeding depending on user role
  useEffect(() => {
    if (!user) return;

    let seeded: LocalNotification[] = [];
    if (user.role === "employee") {
      seeded = [
        { id: "n1", message: "Manager Arun Mehta approved your Q2 goal sheet", read: false, time: "2 hours ago", type: "success" },
        { id: "n2", message: "New Shared Goal assigned: 100% SOC2 Compliance Readiness", read: false, time: "1 day ago", type: "info" },
        { id: "n3", message: "Reminder: Submit Q2 check-in updates by this Friday", read: true, time: "3 days ago", type: "warning" }
      ];
    } else if (user.role === "manager") {
      seeded = [
        { id: "n1", message: "Priya Sharma submitted Q2 check-in for 'Scale Core Microservices'", read: false, time: "10 mins ago", type: "info" },
        { id: "n2", message: "Ravi Kumar requested goal sheet approval for system optimizations", read: false, time: "1 hour ago", type: "warning" },
        { id: "n3", message: "Goal approval timeline locked by kavitha@atomgoal.com", read: true, time: "2 days ago", type: "success" }
      ];
    } else {
      seeded = [
        { id: "n1", message: "Database seeding successfully finalized in Firestore", read: false, time: "5 mins ago", type: "success" },
        { id: "n2", message: "Security Audit: Priya Sharma authenticated via Firebase Auth", read: false, time: "30 mins ago", type: "info" },
        { id: "n3", message: "System warning: Firebase API rate-limits checked & healthy", read: true, time: "1 day ago", type: "warning" }
      ];
    }
    setNotifications(seeded);
  }, [user]);

  if (!user) return null;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast("All notifications marked as read", "success");
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Nav Items Setup
  const navItems: { name: string; path: string; icon: React.ReactNode }[] = [];
  if (user.role === "employee") {
    navItems.push(
      { name: "Overview Hub", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
      { name: "My Objectives", path: "/goals", icon: <Target className="w-4 h-4" /> },
      { name: "Quarterly Check-ins", path: "/checkins", icon: <CheckSquare className="w-4 h-4" /> },
    );
  } else if (user.role === "manager") {
    navItems.push(
      { name: "Team Overview", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
      { name: "Goal Approvals", path: "/approvals", icon: <CheckSquare className="w-4 h-4" /> },
      { name: "Platform Analytics", path: "/analytics", icon: <BarChart3 className="w-4 h-4" /> },
    );
  } else if (user.role === "admin") {
    navItems.push(
      { name: "Enterprise Hub", path: "/", icon: <Activity className="w-4 h-4" /> },
      { name: "Team Directory", path: "/employees", icon: <Users className="w-4 h-4" /> },
      { name: "Shared Objectives", path: "/shared-goals", icon: <Share2 className="w-4 h-4" /> },
      { name: "Governance Audits", path: "/audit", icon: <Settings className="w-4 h-4" /> },
      { name: "Corporate Analytics", path: "/analytics", icon: <BarChart3 className="w-4 h-4" /> },
    );
  }

  // Breadcrumbs Mapping
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/") return ["Workspace", "Overview"];
    if (path === "/goals") return ["Employee", "Objective Sheets"];
    if (path === "/checkins") return ["Employee", "Quarterly Check-ins"];
    if (path === "/approvals") return ["Manager", "Goal Sheet Approvals"];
    if (path === "/analytics") return ["Executive Insights", "Core Analytics"];
    if (path === "/employees") return ["HR Directory", "Employee Roster"];
    if (path === "/shared-goals") return ["Strategic Alignment", "Shared Corporate Goals"];
    if (path === "/audit") return ["Information Security", "System Audit logs"];
    return ["Workspace", "Directory"];
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar - Dark theme for a premium look */}
      <aside className="w-64 bg-[#0A0E1A] border-r border-[#1E293B]/65 flex flex-col shrink-0 text-slate-300 relative z-20">
        
        {/* Sidebar Brand Logo */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10 border border-blue-400/10">
              <Target className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">AtomGoal</h1>
              <p className="text-[9px] text-blue-400 uppercase font-bold tracking-widest leading-none">Enterprise OKR</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Directory</p>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Database Health Badge inside Sidebar */}
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-900/60 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
            <Database className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Platform Sync Status</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {connectionStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">Firebase Live Connection</span>
              </>
            ) : connectionStatus === "offline" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-400">Offline Failover Mode</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold text-indigo-400">Local Sandbox (Demo)</span>
              </>
            )}
          </div>
        </div>

        {/* Sidebar Corporate User Card */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-extrabold text-sm uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate mt-0.5">{user.role} • {user.department}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Premium Top Navigation Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 relative z-30 shadow-sm">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="hover:text-slate-800 transition-colors uppercase tracking-wider">{breadcrumbs[0]}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 uppercase tracking-widest font-extrabold">{breadcrumbs[1]}</span>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-4 relative">
            
            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Alert Logs</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider cursor-pointer"
                      >
                        Clear Red Badges
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No active alerts pending review.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 text-left transition-colors hover:bg-slate-50 flex items-start gap-2.5 relative cursor-default ${
                            !n.read ? "bg-blue-50/20" : ""
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                            n.type === "success" ? "bg-emerald-500" :
                            n.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                          }`} />
                          <div className="flex-1 min-w-0 pr-4">
                            <p className={`text-xs text-slate-700 leading-normal ${!n.read ? "font-semibold" : ""}`}>{n.message}</p>
                            <span className="text-[9px] text-slate-400 mt-1 block font-medium">{n.time}</span>
                          </div>
                          <button
                            onClick={(e) => handleDismissNotification(n.id, e)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Capsule */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                  {user.name.charAt(0)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors shrink-0" />
              </button>

              {/* Profile Dropdown Options */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 py-1.5">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      toast(`Role Clearance: ${user.role.toUpperCase()}`, "info");
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" /> My Clearance
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate("/login");
                      toast("Logged out successfully", "success");
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Outlet Frame */}
        <main className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
          <div className="p-8 max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
