import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { Goal, QuarterlyCheckin, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Check, X, MessageSquare, Users, Clock, CheckCircle2, AlertTriangle,
  FolderLock, ListTodo, Star, Edit3, ArrowRight, ShieldCheck, HelpCircle
} from "lucide-react";

export default function TeamDashboard() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"goals" | "checkins">("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<QuarterlyCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filter, setFilter] = useState<string>("all");

  // Inline goal edits
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editWeightage, setEditWeightage] = useState(0);
  const [editTarget, setEditTarget] = useState("");

  // Goal approval actions
  const [confirmGoalAction, setConfirmGoalAction] = useState<{ type: "approve" | "reject"; goalId: string } | null>(null);
  const [goalFeedback, setGoalFeedback] = useState("");

  // Checkin approval actions
  const [confirmCheckinAction, setConfirmCheckinAction] = useState<{ type: "approve" | "reject"; checkinId: string } | null>(null);
  const [checkinFeedback, setCheckinFeedback] = useState("");

  const team = useMemo(() => allUsers.filter(u => u.managerId === user?.id), [allUsers, user]);
  const teamUserIds = useMemo(() => team.map(t => t.id), [team]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch goals & check-ins
      const allGoals = await goalService.getGoalsByManager(user.id);
      const allCheckins = await goalService.getCheckins();
      
      // Filter check-ins belonging to this manager's team
      const teamCheckins = allCheckins.filter(c => teamUserIds.includes(c.userId));

      setGoals(allGoals);
      setCheckins(teamCheckins);
    } catch (e) {
      console.error("Failed to load manager dashboard feeds:", e);
      toast("Error compiling feeds", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && allUsers.length > 0) {
      fetchData();
    }
  }, [user, allUsers]);

  // Goal filtering
  const filteredGoals = useMemo(() => {
    return filter === "all" ? goals : goals.filter(g => g.status === filter);
  }, [goals, filter]);

  // Group goals by employee
  const goalsByEmployee = useMemo(() => {
    const grouped: Record<string, Goal[]> = {};
    filteredGoals.forEach(g => {
      if (!grouped[g.userId]) grouped[g.userId] = [];
      grouped[g.userId].push(g);
    });
    return grouped;
  }, [filteredGoals]);

  // Single Goal Approve
  const handleApproveGoal = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const updated: Goal = {
      ...goal,
      status: "Approved",
      locked: true,
      managerComments: goalFeedback.trim() || goal.managerComments || "Goal sheet approved."
    };

    try {
      await goalService.saveGoal(updated);
      await auditService.addAuditLog({
        entityType: "goal",
        entityId: goalId,
        changedBy: user!.id,
        action: "APPROVE_GOAL",
        previousValue: { status: goal.status, locked: goal.locked },
        updatedValue: { status: "Approved", locked: true }
      });
      setConfirmGoalAction(null);
      setGoalFeedback("");
      toast(`Goal Approved & Locked`, "success");
      fetchData();
    } catch (e) {
      toast("Failed to approve goal", "error");
    }
  };

  // Single Goal Reject (Rejection reasons are mandatory)
  const handleRejectGoal = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    if (!goalFeedback.trim()) {
      toast("Rejection comments are mandatory for employee revision.", "error");
      return;
    }

    const updated: Goal = {
      ...goal,
      status: "Rejected",
      locked: false,
      managerComments: goalFeedback.trim()
    };

    try {
      await goalService.saveGoal(updated);
      await auditService.addAuditLog({
        entityType: "goal",
        entityId: goalId,
        changedBy: user!.id,
        action: "REJECT_GOAL",
        previousValue: { status: goal.status },
        updatedValue: { status: "Rejected", managerComments: goalFeedback.trim() }
      });
      setConfirmGoalAction(null);
      setGoalFeedback("");
      toast("Goal rejected. Feedback logged.", "success");
      fetchData();
    } catch (e) {
      toast("Failed to reject goal", "error");
    }
  };

  // Checkin Approve (Propagates achievement automatically!)
  const handleApproveCheckin = async (checkinId: string) => {
    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;

    const parentGoal = goals.find(g => g.id === checkin.goalId);
    if (!parentGoal) {
      toast("Parent Goal not found", "error");
      return;
    }

    try {
      // 1. Update checkin status
      const updatedCheckin: QuarterlyCheckin = {
        ...checkin,
        status: "Approved",
        managerComments: checkinFeedback.trim() || "Check-in approved."
      };
      await goalService.saveCheckin(updatedCheckin);

      // 2. Propagate progress update to parent goal
      const updatedGoal: Goal = {
        ...parentGoal,
        achievement: checkin.achievement,
        progressStatus: checkin.progressStatus,
        updatedAt: Date.now()
      };
      await goalService.saveGoal(updatedGoal);

      // 3. Log audit trails
      await auditService.addAuditLog({
        entityType: "checkin",
        entityId: checkinId,
        changedBy: user!.id,
        action: "APPROVE_CHECKIN",
        previousValue: { status: checkin.status },
        updatedValue: { status: "Approved" }
      });

      await auditService.addAuditLog({
        entityType: "goal",
        entityId: parentGoal.id,
        changedBy: user!.id,
        action: "AUTO_PROPAGATE_CHECKIN_PROGRESS",
        previousValue: { achievement: parentGoal.achievement, progressStatus: parentGoal.progressStatus },
        updatedValue: { achievement: checkin.achievement, progressStatus: updatedGoal.progressStatus }
      });

      setConfirmCheckinAction(null);
      setCheckinFeedback("");
      toast("Check-in approved. Goal progress propagated!", "success");
      fetchData();
    } catch (e) {
      toast("Failed to approve check-in", "error");
    }
  };

  // Checkin Reject (Rejection reasons are mandatory)
  const handleRejectCheckin = async (checkinId: string) => {
    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;

    if (!checkinFeedback.trim()) {
      toast("Rejection comments are mandatory for employee revision.", "error");
      return;
    }

    try {
      const updatedCheckin: QuarterlyCheckin = {
        ...checkin,
        status: "Revision Requested",
        managerComments: checkinFeedback.trim()
      };
      await goalService.saveCheckin(updatedCheckin);

      await auditService.addAuditLog({
        entityType: "checkin",
        entityId: checkinId,
        changedBy: user!.id,
        action: "REJECT_CHECKIN",
        previousValue: { status: checkin.status },
        updatedValue: { status: "Revision Requested", managerComments: checkinFeedback.trim() }
      });

      setConfirmCheckinAction(null);
      setCheckinFeedback("");
      toast("Check-in returned to employee with comments", "success");
      fetchData();
    } catch (e) {
      toast("Failed to reject check-in", "error");
    }
  };

  // Inline Goal Edits
  const handleInlineEdit = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updated: Goal = {
      ...goal,
      weightage: editWeightage,
      target: editTarget,
      updatedAt: Date.now()
    };

    try {
      await goalService.saveGoal(updated);
      await auditService.addAuditLog({
        entityType: "goal",
        entityId: goalId,
        changedBy: user!.id,
        action: "MANAGER_INLINE_EDIT_GOAL",
        previousValue: { weightage: goal.weightage, target: goal.target },
        updatedValue: { weightage: editWeightage, target: editTarget }
      });
      setEditingGoal(null);
      toast("Goal metrics updated successfully", "success");
      fetchData();
    } catch (e) {
      toast("Failed to update goal metrics", "error");
    }
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoal(goal.id);
    setEditWeightage(goal.weightage);
    setEditTarget(goal.target);
  };

  const pendingGoalsCount = goals.filter(g => g.status === "Pending Approval").length;
  const pendingCheckinsCount = checkins.filter(c => c.status === "Pending Review").length;

  return (
    <div className="space-y-8 animate-slide-in pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" /> Team Performance Review
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Audit goal sheet layouts, sign off target checkpoints, and review team achievements.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <Users className="w-10 h-10 text-blue-500 bg-blue-50 p-2 rounded-xl shrink-0" />
            <div>
              <div className="text-2xl font-black text-slate-950">{team.length}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Team Members</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <Clock className="w-10 h-10 text-amber-500 bg-amber-50 p-2 rounded-xl shrink-0" />
            <div>
              <div className="text-2xl font-black text-slate-950">{pendingGoalsCount}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Pending Goals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <FolderLock className="w-10 h-10 text-emerald-500 bg-emerald-50 p-2 rounded-xl shrink-0" />
            <div>
              <div className="text-2xl font-black text-slate-950">{goals.filter(g => g.status === "Approved").length}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Approved OKRs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <ListTodo className="w-10 h-10 text-indigo-500 bg-indigo-50 p-2 rounded-xl shrink-0" />
            <div>
              <div className="text-2xl font-black text-slate-950">{pendingCheckinsCount}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Pending Check-ins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("goals")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === "goals"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Goal Sheet Reviews {pendingGoalsCount > 0 && <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[9px]">{pendingGoalsCount}</span>}
        </button>

        <button
          onClick={() => setActiveTab("checkins")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === "checkins"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Quarterly Check-ins Review {pendingCheckinsCount > 0 && <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[9px]">{pendingCheckinsCount}</span>}
        </button>
      </div>

      {/* Render Main Review View */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest animate-pulse">Compiling team review sheets...</p>
        </div>
      ) : activeTab === "goals" ? (
        /* --- GOALS SHEET REVIEW --- */
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Quick Filter:</span>
            {["all", "Pending Approval", "Approved", "Rejected"].map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className="text-[10px] font-bold uppercase h-7 rounded-lg cursor-pointer"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All Submission States" : f}
              </Button>
            ))}
          </div>

          {Object.keys(goalsByEmployee).length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-3">
                <Users className="w-10 h-10 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">No matching submissions found</h3>
                <p className="text-xs text-slate-400">
                  Your team members haven't submitted goal sheets matching this filter state.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(goalsByEmployee).map(([userId, userGoals]) => {
              const emp = team.find(u => u.id === userId) || allUsers.find(u => u.id === userId);
              return (
                <Card key={userId} className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-xs uppercase shadow-sm">
                        {emp?.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-extrabold text-slate-800">{emp?.name}</CardTitle>
                        <CardDescription className="text-xs">{emp?.department} • {userGoals.length} strategic objective(s) scoped</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/20">
                        <TableRow>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500">Thrust Area</TableHead>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500">Goal Description</TableHead>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-center">Target Metric</TableHead>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-center">Weightage</TableHead>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500">State</TableHead>
                          <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-right pr-6">Review Controls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs divide-y divide-slate-100 text-slate-700">
                        {userGoals.map(goal => (
                          <TableRow key={goal.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 font-bold text-slate-500">{goal.thrustArea}</td>
                            <td className="py-4 font-semibold text-slate-800 max-w-[240px]">
                              <div>{goal.title}</div>
                              {goal.description && <div className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-2">{goal.description}</div>}
                              {goal.managerComments && (
                                <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] text-slate-500 font-medium">
                                  <span className="font-extrabold text-slate-600 block mb-0.5 uppercase tracking-wide">Last Review Comment:</span>
                                  {goal.managerComments}
                                </div>
                              )}
                            </td>
                            <td className="py-4 text-center font-bold text-slate-800">
                              {editingGoal === goal.id ? (
                                <Input className="h-8 w-24 text-xs font-bold" value={editTarget} onChange={e => setEditTarget(e.target.value)} />
                              ) : (
                                <>{goal.target} {goal.unit}</>
                              )}
                            </td>
                            <td className="py-4 text-center font-bold text-slate-800">
                              {editingGoal === goal.id ? (
                                <Input className="h-8 w-16 text-xs text-center font-bold" type="number" value={editWeightage} onChange={e => setEditWeightage(parseInt(e.target.value) || 0)} />
                              ) : (
                                <>{goal.weightage}%</>
                              )}
                            </td>
                            <td className="py-4">
                              <Badge className={`text-[9px] font-bold uppercase tracking-wider ${
                                goal.status === "Approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                goal.status === "Rejected" ? "bg-rose-100 text-rose-800 border-rose-200" :
                                "bg-amber-100 text-amber-800 border-amber-200"
                              }`}>
                                {goal.status}
                              </Badge>
                            </td>
                            <td className="py-4 text-right pr-6">
                              {editingGoal === goal.id ? (
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => handleInlineEdit(goal.id)} className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer transition-colors shadow-sm">Save</button>
                                  <button onClick={() => setEditingGoal(null)} className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">Cancel</button>
                                </div>
                              ) : goal.status === "Pending Approval" ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setConfirmGoalAction({ type: "approve", goalId: goal.id })}
                                    className="inline-flex items-center justify-center w-7 h-7 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600 rounded-lg border border-emerald-200 cursor-pointer transition-all"
                                    title="Sign Off / Approve Goal"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmGoalAction({ type: "reject", goalId: goal.id })}
                                    className="inline-flex items-center justify-center w-7 h-7 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-lg border border-rose-200 cursor-pointer transition-all"
                                    title="Request Revision"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => startEditGoal(goal)}
                                    className="inline-flex items-center justify-center w-7 h-7 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 cursor-pointer transition-all"
                                    title="Edit Weight / Target metrics"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEditGoal(goal)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                                  <Edit3 className="w-3 h-3" /> Adjust Metrics
                                </button>
                              )}
                            </td>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* --- QUARTERLY CHECK-INS REVIEW --- */
        <div className="space-y-6">
          <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <ListTodo className="w-4.5 h-4.5 text-indigo-600" /> Quarterly Milestones Review Queue
              </CardTitle>
              <CardDescription className="text-xs">Audit team progress updates. Approving a check-in updates parent goals automatically.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/20">
                  <TableRow>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 pl-4">Team Member</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500">Scope Target Goal</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-center">Cycle</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-center">Value Claimed</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500">Target Alignment Status</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase font-bold text-slate-500 text-right pr-6">Review Decisions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-slate-100 text-slate-700">
                  {checkins.map(chk => {
                    const emp = team.find(t => t.id === chk.userId) || allUsers.find(u => u.id === chk.userId);
                    const parentGoal = goals.find(g => g.id === chk.goalId);

                    return (
                      <TableRow key={chk.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-[10px] uppercase">
                              {emp?.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800">{emp?.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{emp?.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-semibold text-slate-800 max-w-[220px]">
                          <div>{parentGoal?.title || "Unknown Objective Reference"}</div>
                          <div className="text-[10px] text-indigo-500 font-semibold mt-1 flex items-center gap-1 italic">
                            Achieved: "{chk.achievement}"
                          </div>
                          {chk.managerComments && (
                            <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] text-slate-500 font-medium">
                              <span className="font-extrabold text-slate-600 block mb-0.5 uppercase tracking-wide">Last Check-in comment:</span>
                              {chk.managerComments}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-center font-bold text-slate-600">{chk.quarter}</td>
                        <td className="py-4 text-center">
                          <span className="font-bold text-slate-900 text-sm">{chk.achievement}%</span>
                          <span className="text-[9px] text-slate-400 block font-medium mt-0.5">claimed achievement</span>
                        </td>
                        <td className="py-4">
                          <Badge className={`text-[9px] font-bold uppercase tracking-wider ${
                            chk.status === "Approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            chk.status === "Revision Requested" ? "bg-rose-100 text-rose-800 border-rose-200" :
                            "bg-amber-100 text-amber-800 border-amber-200"
                          }`}>
                            {chk.status}
                          </Badge>
                        </td>
                        <td className="py-4 text-right pr-6">
                          {chk.status === "Pending Review" ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setConfirmCheckinAction({ type: "approve", checkinId: chk.id })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => setConfirmCheckinAction({ type: "reject", checkinId: chk.id })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Revision
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic pr-2">Review Completed</span>
                          )}
                        </td>
                      </TableRow>
                    );
                  })}

                  {checkins.length === 0 && (
                    <TableRow>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <ListTodo className="w-10 h-10 text-slate-300" />
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Review queue empty</h4>
                          <p className="text-xs text-slate-400">
                            No team quarterly check-ins have been submitted for validation yet.
                          </p>
                        </div>
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approve/Reject Goal Modal */}
      {confirmGoalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmGoalAction(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-up border border-slate-100">
            <div className="flex items-center gap-3">
              {confirmGoalAction.type === "approve" ? (
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
              )}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  {confirmGoalAction.type === "approve" ? "Confirm Goal Approval" : "Request Goal Revision"}
                </h3>
                <p className="text-xs text-slate-500">Specify audit log feedback to guide the employee.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Feedback Comments {confirmGoalAction.type === "reject" && <span className="text-rose-500">*Required</span>}
              </label>
              <textarea
                placeholder="Type descriptive feedback here..."
                className="w-full min-h-[80px] p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:border-blue-500 text-slate-800 focus:outline-none"
                value={goalFeedback}
                onChange={e => setGoalFeedback(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => { setConfirmGoalAction(null); setGoalFeedback(""); }}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                Dismiss Action
              </button>
              <button
                onClick={() => confirmGoalAction.type === "approve"
                  ? handleApproveGoal(confirmGoalAction.goalId)
                  : handleRejectGoal(confirmGoalAction.goalId)
                }
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer ${
                  confirmGoalAction.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/10"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10"
                }`}
              >
                {confirmGoalAction.type === "approve" ? "Approve Goal" : "Send Back for Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Checkin Modal */}
      {confirmCheckinAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmCheckinAction(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-up border border-slate-100">
            <div className="flex items-center gap-3">
              {confirmCheckinAction.type === "approve" ? (
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
              )}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  {confirmCheckinAction.type === "approve" ? "Sign Off Milestone" : "Reject Check-in Milestone"}
                </h3>
                <p className="text-xs text-slate-500">Provide feedback. Approval propagates progress details instantly.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Review Comments {confirmCheckinAction.type === "reject" && <span className="text-rose-500">*Required</span>}
              </label>
              <textarea
                placeholder="Type review narrative..."
                className="w-full min-h-[80px] p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:border-blue-500 text-slate-800 focus:outline-none"
                value={checkinFeedback}
                onChange={e => setCheckinFeedback(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => { setConfirmCheckinAction(null); setCheckinFeedback(""); }}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => confirmCheckinAction.type === "approve"
                  ? handleApproveCheckin(confirmCheckinAction.checkinId)
                  : handleRejectCheckin(confirmCheckinAction.checkinId)
                }
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer ${
                  confirmCheckinAction.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/10"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10"
                }`}
              >
                {confirmCheckinAction.type === "approve" ? "Sign Off & Propagate" : "Return Check-in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
