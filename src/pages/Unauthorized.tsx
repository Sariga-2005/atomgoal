import React from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080B16] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-amber-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md text-center space-y-6 relative z-10">
        <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/5 animate-pulse">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Access Violation</h1>
          <p className="text-slate-400 text-sm">
            Your authenticated session role is restricted from viewing this directory.
          </p>
        </div>

        <div className="border border-slate-900 bg-slate-950/60 rounded-2xl p-4 text-left space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Active Profile</span>
            <span className="font-semibold text-slate-200">{user?.name || "Anonymous User"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Security Clearance</span>
            <span className="font-bold text-rose-400 uppercase tracking-wider">{user?.role || "Guest"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Department Scope</span>
            <span className="font-semibold text-slate-200">{user?.department || "Unassigned"}</span>
          </div>
          <div className="pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
            <Lock className="w-3 h-3 text-rose-400 shrink-0" />
            Audit trail entry generated automatically
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button 
            onClick={() => navigate(-1)} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-800 rounded-xl h-10 text-xs uppercase tracking-widest gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Navigate Back
          </Button>
          <Link to="/" className="w-full">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl h-10 text-xs uppercase tracking-widest gap-2 shadow-lg shadow-blue-600/10"
            >
              <Home className="w-3.5 h-3.5" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
