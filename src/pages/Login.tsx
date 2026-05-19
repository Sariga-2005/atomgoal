import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Target, Mail, Lock, UserPlus, Sparkles, ChevronRight, HelpCircle,
  Database, AlertTriangle, Play, ArrowRight
} from "lucide-react";

export default function Login() {
  const { login, signUp, user, allUsers, connectionStatus } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showDemoCreds, setShowDemoCreds] = useState(true);

  // Sign In Form States
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign Up Form States
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<"employee" | "manager" | "admin">("employee");
  const [signUpDept, setSignUpDept] = useState("Engineering");
  const [signUpManagerId, setSignUpManagerId] = useState("");

  // No auto-redirect — always show the login/landing page first

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail) {
      toast("Please enter your work email", "error");
      return;
    }
    setLoading(true);
    try {
      const email = signInEmail.trim().toLowerCase();
      const password = signInPassword || "Demo123";
      await login(email, password);
      toast("Logged in successfully! Welcome to AtomGoal.", "success");
      navigate("/dashboard");
    } catch (err: any) {
      toast(err?.message || "Invalid credentials. Try employee@demo.com with Demo123", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName || !signUpEmail || !signUpPassword) {
      toast("Please fill in all required fields", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpEmail)) {
      toast("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);
    const newProfile = {
      name: signUpName.trim(),
      email: signUpEmail.trim().toLowerCase(),
      role: signUpRole,
      department: signUpDept,
      managerId: signUpRole === "employee" ? signUpManagerId || "mgr1" : undefined
    };

    try {
      await signUp(newProfile, signUpPassword);
      toast("Account registered successfully! Welcome to AtomGoal.", "success");
      navigate("/dashboard");
    } catch (err: any) {
      toast(err?.message || "Failed to create account. Try signing in with demo accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    setSignInEmail(email);
    setSignInPassword("Demo123");
    try {
      await login(email, "Demo123");
      toast(`Signed in successfully as ${email.split("@")[0]}`, "success");
      navigate("/dashboard");
    } catch (err) {
      toast("Quick sign-in failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const managers = allUsers.filter(u => u.role === "manager" || u.role === "admin");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#080B16] text-slate-100 relative overflow-hidden font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none" />

      {/* Left side: Premium SaaS Hero Landing Info */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-16 relative z-10 bg-slate-950/30 backdrop-blur-3xl border-r border-slate-900/60">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">AtomGoal</span>
              <span className="text-[10px] block text-blue-400 font-semibold tracking-widest uppercase leading-none">Enterprise OKR</span>
            </div>
          </div>

          {/* Connection Status Badge on Header */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md">
            {connectionStatus === "connected" ? (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-300">Firebase Live</span>
              </>
            ) : connectionStatus === "offline" ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Offline Cache Mode</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-indigo-300">Demo Sandbox</span>
              </>
            )}
          </div>
        </div>

        {/* Hero Central Content */}
        <div className="my-auto py-12 md:py-0 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Enterprise-Grade Performance Suite
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Align targets. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Deliver impact.
            </span>
          </h2>

          <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
            The next-generation enterprise performance-management portal. Seamlessly align company strategy with daily engineering workloads, enforce robust goal sheet reviews, and analyze execution via premium Recharts dashboards.
          </p>

          {/* Key Value Props */}
          <div className="space-y-4 max-w-md">
            {[
              { title: "Real-Time Firebase Integration", desc: "Secured email/password auth mapping dynamically to Firestore roles and cache systems." },
              { title: "Structured OKR Approvals", desc: "Manager lock-in cycles, rejection timelines, and quarterly check-ins." },
              { title: "Immutability & Audit Logs", desc: "Enterprise governance with comprehensive changelog tracking." }
            ].map((f, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{f.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} AtomGoal. Suitability: Hackathon Finalist Suite.
        </div>
      </div>

      {/* Right side: Login / Signup Form Area */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Already Authenticated Banner */}
          {user && (
            <div className="p-5 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Target className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">Welcome back, {user.name}</p>
                  <p className="text-[10px] text-emerald-500/80">{user.role} • {user.department}</p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-10 text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/15 cursor-pointer transition-all gap-2"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {/* Card Container */}
          <Card className="border border-slate-900 bg-slate-950/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-900">
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                  activeTab === "signin"
                    ? "border-b-2 border-blue-500 text-white bg-slate-900/40"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                  activeTab === "signup"
                    ? "border-b-2 border-blue-500 text-white bg-slate-900/40"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                Register Account
              </button>
            </div>

            <CardContent className="pt-6 px-6 pb-6">
              {activeTab === "signin" ? (
                /* --- SIGN IN --- */
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Work Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="employee@demo.com"
                        className="pl-10 bg-slate-950/70 border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl h-10 text-sm focus:ring-1 focus:ring-blue-500"
                        value={signInEmail}
                        onChange={e => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-950/70 border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl h-10 text-sm focus:ring-1 focus:ring-blue-500"
                        value={signInPassword}
                        onChange={e => setSignInPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl h-10 text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 mt-6 transition-all duration-300"
                  >
                    {loading ? "Verifying Credentials..." : "Authenticate Session"}
                  </Button>
                </form>
              ) : (
                /* --- SIGN UP --- */
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Priya Sharma"
                      className="bg-slate-950/70 border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl h-10 text-sm"
                      value={signUpName}
                      onChange={e => setSignUpName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Work Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="priya@atomgoal.com"
                      className="bg-slate-950/70 border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl h-10 text-sm"
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-slate-950/70 border-slate-800 focus:border-blue-500 text-slate-100 rounded-xl h-10 text-sm"
                      value={signUpPassword}
                      onChange={e => setSignUpPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-role" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Assigned Role</Label>
                      <Select
                        id="signup-role"
                        value={signUpRole}
                        onChange={e => setSignUpRole(e.target.value as any)}
                        className="bg-slate-950/70 border-slate-800 text-slate-200 rounded-xl h-10 text-xs"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-dept" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Department</Label>
                      <Select
                        id="signup-dept"
                        value={signUpDept}
                        onChange={e => setSignUpDept(e.target.value)}
                        className="bg-slate-950/70 border-slate-800 text-slate-200 rounded-xl h-10 text-xs"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="HR">HR & Culture</option>
                        <option value="Product">Product</option>
                        <option value="Sales">Sales & Growth</option>
                      </Select>
                    </div>
                  </div>

                  {signUpRole === "employee" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-manager" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Assign Direct Manager</Label>
                      <Select
                        id="signup-manager"
                        value={signUpManagerId}
                        onChange={e => setSignUpManagerId(e.target.value)}
                        className="bg-slate-950/70 border-slate-800 text-slate-200 rounded-xl h-10 text-xs"
                      >
                        <option value="">Select Manager...</option>
                        {managers.map(mgr => (
                          <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.department})</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl h-10 text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 mt-6 transition-all duration-300"
                  >
                    {loading ? "Registering..." : "Provision New Account"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Quick Demo Credentials for Judges */}
          <div className="border border-slate-900 bg-slate-950/40 rounded-2xl p-4 space-y-3">
            <button
              onClick={() => setShowDemoCreds(!showDemoCreds)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                Quick-Access Live Demo Accounts (Judges)
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showDemoCreds ? "rotate-90 text-blue-400" : ""}`} />
            </button>

            {showDemoCreds && (
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-900">
                {[
                  { name: "Priya Sharma", email: "employee@demo.com", role: "Employee", desc: "Individual OKRs & check-ins" },
                  { name: "Arun Mehta", email: "manager@demo.com", role: "Manager", desc: "Team sheets & check-in approvals" },
                  { name: "Kavitha Nair", email: "admin@demo.com", role: "Admin", desc: "Audit logs & corporate alignment" }
                ].map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(demo.email)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900/60 border border-slate-900 text-left transition-all hover:border-blue-900/80 cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">{demo.name}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          demo.role === "Employee" ? "bg-blue-900/40 text-blue-300" :
                          demo.role === "Manager" ? "bg-amber-900/40 text-amber-300" :
                          "bg-emerald-900/40 text-emerald-300"
                        }`}>
                          {demo.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{demo.email} • Password: <span className="font-mono text-slate-400">Demo123</span></div>
                      <div className="text-[9px] text-slate-600 mt-1 italic leading-none">{demo.desc}</div>
                    </div>
                    <Play className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
