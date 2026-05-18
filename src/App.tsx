import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import DashboardLayout from "./layouts/DashboardLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy loaded pages for performance
const Login = React.lazy(() => import("./pages/Login"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const EmployeeDashboard = React.lazy(() => import("./pages/employee/EmployeeDashboard"));
const GoalCreation = React.lazy(() => import("./pages/employee/GoalCreation"));
const Checkins = React.lazy(() => import("./pages/employee/Checkins"));
const TeamDashboard = React.lazy(() => import("./pages/manager/TeamDashboard"));
const Analytics = React.lazy(() => import("./pages/manager/Analytics"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const Employees = React.lazy(() => import("./pages/admin/Employees"));
const SharedGoals = React.lazy(() => import("./pages/admin/SharedGoals"));
const AuditTrail = React.lazy(() => import("./pages/admin/AuditTrail"));

function PageLoader() {
  return (
    <div className="flex h-[100vh] w-full items-center justify-center bg-[#080B16]">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-xl border-2 border-blue-500 border-t-transparent bg-blue-500/5 shadow-md shadow-blue-500/10" />
        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold animate-pulse">Initializing Portal...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function RoleBasedHome() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "employee") return <EmployeeDashboard />;
  if (user.role === "manager") return <TeamDashboard />;
  if (user.role === "admin") return <AdminDashboard />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<RoleBasedHome />} />

                  {/* Employee Routes */}
                  <Route path="goals" element={<ProtectedRoute allowedRoles={["employee"]}><GoalCreation /></ProtectedRoute>} />
                  <Route path="checkins" element={<ProtectedRoute allowedRoles={["employee"]}><Checkins /></ProtectedRoute>} />

                  {/* Manager Routes */}
                  <Route path="approvals" element={<ProtectedRoute allowedRoles={["manager"]}><TeamDashboard /></ProtectedRoute>} />
                  <Route path="analytics" element={<ProtectedRoute allowedRoles={["manager", "admin"]}><Analytics /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="employees" element={<ProtectedRoute allowedRoles={["admin"]}><Employees /></ProtectedRoute>} />
                  <Route path="shared-goals" element={<ProtectedRoute allowedRoles={["admin"]}><SharedGoals /></ProtectedRoute>} />
                  <Route path="audit" element={<ProtectedRoute allowedRoles={["admin"]}><AuditTrail /></ProtectedRoute>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
