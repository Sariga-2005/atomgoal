import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { Goal, AuditLog } from "@/types";
import { useAnalyticsData } from "@/lib/useAnalyticsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users, Target, CheckCircle2, Clock, BarChart3, Settings, Share2, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const { allUsers } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockGoalId, setUnlockGoalId] = useState("");
  const analytics = useAnalyticsData();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gList, lList] = await Promise.all([
          goalService.getGoals(),
          auditService.getAuditLogs()
        ]);
        setGoals(gList);
        setLogs(lList);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUnlockGoal = async () => {
    if (!unlockGoalId.trim()) return;
    const goal = goals.find(g => g.id === unlockGoalId.trim());
    if (!goal) {
      toast("Goal not found", "error");
      return;
    }
    await goalService.saveGoal({ ...goal, locked: false, status: "Draft" });
    toast("Goal Unlocked", "success");
    setUnlockGoalId("");
    setTimeout(() => window.location.reload(), 1500);
  };

  const employees = allUsers.filter(u => u.role === "employee");
  const totalGoals = goals.length;
  const approved = goals.filter(g => g.status === "Approved").length;
  const pending = goals.filter(g => g.status === "Pending Approval").length;
  const completed = goals.filter(g => g.progressStatus === "Completed").length;
  const completionRate = totalGoals > 0 ? Math.round((completed / totalGoals) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Organization-wide goal management overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <Users className="w-5 h-5 text-blue-500 mb-2" />
            <div className="text-xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <Target className="w-5 h-5 text-purple-500 mb-2" />
            <div className="text-xl font-bold">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">Total Goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <Clock className="w-5 h-5 text-amber-500 mb-2" />
            <div className="text-xl font-bold">{pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
            <div className="text-xl font-bold">{approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <BarChart3 className="w-5 h-5 text-cyan-500 mb-2" />
            <div className="text-xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Organization Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={completionRate} className="flex-1 h-3" />
            <span className="text-sm font-bold">{completionRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{completed} of {totalGoals} goals completed</p>
        </CardContent>
      </Card>

      {/* Check-in Completion Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Check-in Completion Rates by Quarter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.managerEffectiveness.map(q => (
              <div key={q.quarter} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{q.quarter} Check-ins</span>
                  <span className="text-xs font-bold text-slate-700">{q.completionRate}%</span>
                </div>
                <Progress value={q.completionRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cycle Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cycle Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Override Active Phase</label>
              <Select
                value={localStorage.getItem("admin_override_phase") === "Checkin" ? localStorage.getItem("admin_override_quarter") || "Default" : localStorage.getItem("admin_override_phase") || "Default"}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "Default") {
                    localStorage.removeItem("admin_override_phase");
                    localStorage.removeItem("admin_override_quarter");
                  } else if (val === "GoalSetting" || val === "Closed") {
                    localStorage.setItem("admin_override_phase", val);
                    localStorage.setItem("admin_override_quarter", "null");
                  } else {
                    localStorage.setItem("admin_override_phase", "Checkin");
                    localStorage.setItem("admin_override_quarter", val);
                  }
                  window.location.reload();
                }}
                className="h-10 border-slate-200 bg-slate-50 text-slate-800 rounded-xl text-xs w-full"
              >
                <option value="Default">Default (Date based)</option>
                <option value="GoalSetting">Goal Setting Open</option>
                <option value="Q1">Q1 Check-in Open</option>
                <option value="Q2">Q2 Check-in Open</option>
                <option value="Q3">Q3 Check-in Open</option>
                <option value="Q4">Q4 Check-in Open</option>
                <option value="Closed">Cycle Closed</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Specific Goal Unlock */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unlock Specific Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Goal ID</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Goal ID"
                  value={unlockGoalId}
                  onChange={e => setUnlockGoalId(e.target.value)}
                  className="text-xs"
                />
                <Button onClick={handleUnlockGoal} className="text-xs px-4" disabled={!unlockGoalId.trim()}>
                  Unlock
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/employees">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Manage Employees</p>
                  <p className="text-xs text-muted-foreground">View all employees & unlock goals</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/shared-goals">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Shared Goals</p>
                  <p className="text-xs text-muted-foreground">Push departmental KPIs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/audit">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-sm">Audit Trail</p>
                  <p className="text-xs text-muted-foreground">{logs.length} events logged</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
