import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { goalService } from "@/services";
import { Goal } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, ArrowRight, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      goalService.getGoals(user.id).then(g => {
        setGoals(g);
        setLoading(false);
      });
    }
  }, [user]);

  const totalGoals = goals.length;
  const approved = goals.filter(g => g.status === "Approved").length;
  const pending = goals.filter(g => g.status === "Pending Approval").length;
  const completed = goals.filter(g => g.progressStatus === "Completed").length;
  const totalWeightage = goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1">Here's your performance overview for the current cycle.</p>
        </div>
        <Link to="/dashboard/goals">
          <Button className="gap-2 shadow-md hover:shadow-lg transition-all h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-700">
            <Target className="w-4 h-4" /> Goal Sheet <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <CardContent className="pt-6 pb-5 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Total Goals</p>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalGoals}</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <CardContent className="pt-6 pb-5 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Approved</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{approved}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <CardContent className="pt-6 pb-5 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{pending}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <CardContent className="pt-6 pb-5 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{completed}</div>
          </CardContent>
        </Card>
      </div>

      {totalGoals === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-500">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Goals Set Yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">Alignment starts with clear objectives. Create your goal sheet to start tracking performance.</p>
            <Link to="/dashboard/goals"><Button className="rounded-full px-6 bg-slate-900 text-white hover:bg-slate-800">Start Planning</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">Weightage Allocation</CardTitle>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${totalWeightage === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {totalWeightage}% Total
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <Progress value={Math.min(totalWeightage, 100)} className={`flex-1 h-3 rounded-full bg-slate-100 ${totalWeightage === 100 ? "[&>div]:bg-emerald-500" : totalWeightage > 100 ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"}`} />
              </div>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold text-slate-900 pt-2">Active Objectives</h3>
          <div className="grid md:grid-cols-2 gap-5">
            {goals.map(g => (
              <Card key={g.id} className="border-0 shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:ring-blue-200 transition-all cursor-default">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-semibold uppercase tracking-wider">
                      {g.thrustArea}
                    </Badge>
                    <Badge variant="outline" className={`border-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      g.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                      g.status === "Rejected" ? "bg-red-100 text-red-700" :
                      g.status === "Pending Approval" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {g.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-base mb-2 leading-tight">{g.title}</h4>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">{g.description || "No description provided."}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target</span>
                      <span className="text-sm font-medium text-slate-700">{g.target} <span className="text-slate-400 text-xs">{g.unit}</span></span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weight</span>
                      <span className="text-sm font-bold text-slate-900">{g.weightage}%</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {g.progressStatus === "Completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       g.progressStatus === "On Track" ? <TrendingUp className="w-4 h-4 text-blue-500" /> :
                       <AlertCircle className="w-4 h-4 text-slate-400" />}
                      <span className="text-xs font-medium text-slate-700">{g.progressStatus}</span>
                    </div>
                    {g.achievement && (
                      <span className="text-xs font-semibold text-slate-900">Current: {g.achievement}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
