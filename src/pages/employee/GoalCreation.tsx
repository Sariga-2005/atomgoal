import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { Goal, UnitOfMeasurement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ConfirmModal from "@/components/ConfirmModal";
import {
  PlusCircle, Trash2, Save, Send, Lock, CheckCircle2,
  AlertTriangle, Edit2, X, Check, HelpCircle, Info,
  Sparkles, TrendingUp, Plus, FileText, CheckSquare, Unlock,
  LockKeyhole, AlertCircle, RefreshCw, Target, CalendarClock
} from "lucide-react";
import { getCurrentActiveWindow, isGoalCreationAllowed, getNextOpenWindow } from "@/lib/temporal";

function emptyGoal(userId: string, managerId: string): Goal {
  return {
    id: Math.random().toString(36).substring(2, 9),
    userId, managerId,
    thrustArea: "", title: "", description: "",
    unit: "%" as UnitOfMeasurement,
    target: "", weightage: 10,
    status: "Draft", isShared: false, locked: false,
    achievement: "", progressStatus: "Not Started",
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export default function GoalCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const goalWindowOpen = isGoalCreationAllowed();
  const nextWindow = getNextOpenWindow();
  
  // High-fidelity state management for inline card edits
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [backupGoals, setBackupGoals] = useState<Goal[]>([]);
  const [cardErrors, setCardErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    const fetchExisting = async () => {
      try {
        const existing = await goalService.getGoals(user.id);
        if (existing.length > 0) {
          setGoals(existing);
        } else {
          setGoals([emptyGoal(user.id, user.managerId || "")]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, [user]);

  const isLocked = goals.length > 0 && goals.every(g => g.status === "Pending Approval" || g.status === "Approved");
  const isRejected = goals.some(g => g.status === "Rejected");
  const totalWeightage = goals
    .filter(g => g.status !== "Rejected")
    .reduce((s, g) => s + (Number(g.weightage) || 0), 0);
  const remainingWeightage = Math.max(0, 100 - totalWeightage);

  // Overall Goal Sheet Status mapping
  const sheetStatus = useMemo(() => {
    if (goals.some(g => g.status === "Approved")) return "Approved";
    if (goals.some(g => g.status === "Pending Approval")) return "Pending Approval";
    if (goals.some(g => g.status === "Rejected")) return "Rejected";
    return "Draft";
  }, [goals]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (goals.length === 0) {
      errors.push("Add at least one goal.");
    }
    if (totalWeightage !== 100) {
      errors.push(`Total weightage must be exactly 100% (currently ${totalWeightage}%).`);
    }
    goals.forEach((g, i) => {
      const num = i + 1;
      if (!g.title.trim()) errors.push(`Goal #${num}: Title is required.`);
      if (!g.thrustArea.trim()) errors.push(`Goal #${num}: Thrust area is required.`);
      if (!g.target.trim()) errors.push(`Goal #${num}: Target is required.`);
      if ((Number(g.weightage) || 0) < 10) errors.push(`Goal #${num}: Minimum weightage is 10%.`);
    });
    return errors;
  }, [goals, totalWeightage]);

  const isValid = validationErrors.length === 0;
  const isEditingAny = editingGoalId !== null;

  const addGoal = () => {
    if (goals.length >= 8) {
      toast("You can create a maximum of 8 goals.", "error");
      return;
    }
    const newGoalObj = emptyGoal(user!.id, user!.managerId || "");
    setBackupGoals([...goals]);
    setGoals([...goals, newGoalObj]);
    setEditingGoalId(newGoalObj.id);
    toast("New goal added. Please specify metrics below.", "info");
  };

  const handleDeleteGoal = async (goalId: string) => {
    // Remove locally
    const filtered = goals.filter(g => g.id !== goalId);
    setGoals(filtered);
    
    if (editingGoalId === goalId) {
      setEditingGoalId(null);
    }
    
    // Clear card errors
    setCardErrors(prev => {
      const copy = { ...prev };
      delete copy[goalId];
      return copy;
    });

    // Delete from Firestore
    try {
      await goalService.deleteGoal(goalId);
      toast("Goal deleted successfully", "success");
    } catch (e) {
      console.error("Failed to delete goal from Firestore:", e);
      toast("Failed to delete goal from database", "error");
    }
  };

  const startEditing = (goalId: string) => {
    setBackupGoals([...goals]);
    setEditingGoalId(goalId);
    setCardErrors(prev => {
      const copy = { ...prev };
      delete copy[goalId];
      return copy;
    });
  };

  const cancelEditing = (goalId: string) => {
    const goalObj = goals.find(g => g.id === goalId);
    
    // If it's a new goal with blank title and thrustArea, discard it on cancel
    if (goalObj && !goalObj.title.trim() && !goalObj.thrustArea.trim()) {
      setGoals(goals.filter(g => g.id !== goalId));
    } else if (backupGoals.length > 0) {
      setGoals(backupGoals);
    }
    setEditingGoalId(null);
    setCardErrors(prev => {
      const copy = { ...prev };
      delete copy[goalId];
      return copy;
    });
  };

  const saveCard = (goalId: string) => {
    const goalObj = goals.find(g => g.id === goalId);
    if (!goalObj) return;

    const errors: string[] = [];
    if (!goalObj.title.trim()) errors.push("Title is required.");
    if (!goalObj.thrustArea.trim()) errors.push("Thrust Area is required.");
    if (!goalObj.target.trim()) errors.push("Target metric is required.");
    if ((Number(goalObj.weightage) || 0) < 10) errors.push("Minimum weightage per goal is 10%.");

    if (errors.length > 0) {
      setCardErrors(prev => ({ ...prev, [goalId]: errors }));
      toast("Please resolve active errors in this goal card.", "error");
      return;
    }

    setCardErrors(prev => {
      const copy = { ...prev };
      delete copy[goalId];
      return copy;
    });
    setEditingGoalId(null);
    toast("Goal card completed in draft.", "success");
  };

  const updateGoalField = (index: number, field: keyof Goal, value: any) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value, updatedAt: Date.now() };
    setGoals(updated);
  };

  const handleSaveDraft = async () => {
    if (isEditingAny) {
      toast("Please finalize editing your active goal card.", "info");
      return;
    }
    // Don't arbitrarily overwrite statuses to "Draft". Keep existing statuses.
    try {
      await goalService.saveGoals(goals);
      toast("Goal sheet draft successfully saved to Cloud!", "success");
    } catch (e) {
      toast("Failed to save draft", "error");
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    if (isEditingAny) {
      toast("Please finalize editing your active goal card.", "info");
      return;
    }
    
    // Only transition Draft goals to Pending Approval. Keep Approved/Rejected/Pending as they are.
    const submitted = goals.map(g => 
      g.status === "Draft" ? { ...g, status: "Pending Approval" as const, locked: true } : g
    );
    
    // Identify which goals actually changed state for audit logging
    const changedGoals = submitted.filter(g => goals.find(og => og.id === g.id)?.status === "Draft");

    try {
      await goalService.saveGoals(submitted);
      await Promise.all(changedGoals.map(g =>
        auditService.addAuditLog({
          entityType: "goal", entityId: g.id, changedBy: user!.id,
          action: "SUBMIT_GOAL",
          previousValue: { status: "Draft" },
          updatedValue: { status: "Pending Approval" },
        })
      ));
      setGoals(submitted);
      setConfirmSubmit(false);
      toast("Goal sheet submitted for review!", "success");
    } catch (e) {
      toast("Failed to submit goals", "error");
    }
  };

  const handleResubmit = async () => {
    const reset = goals.map(g => ({ ...g, status: "Draft" as const, locked: false }));
    try {
      await goalService.saveGoals(reset);
      setGoals(reset);
      toast("Goal sheet unlocked for revisions.", "info");
    } catch (e) {
      toast("Failed to unlock goals", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-xs uppercase tracking-widest text-slate-500 font-extrabold animate-pulse">
          Retrieving objectives...
        </p>
      </div>
    );
  }

  const handleEditRejected = (goalId: string, index: number) => {
    startEditing(goalId);
    updateGoalField(index, "status", "Draft");
  };

  return (
    <div className="space-y-8 animate-slide-in pb-24">
      {/* ── Window Enforcement Banner ── */}
      {goalWindowOpen ? (
        <Card className="border-0 shadow-sm ring-1 ring-emerald-200 bg-emerald-50/40 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-semibold">
              Goal setting window is <strong>open</strong> (April–May). You can create and submit goals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/40 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-semibold">
              Goal setting window is <strong>closed</strong>. Goals can only be submitted in April–May. You can save drafts but cannot submit for approval.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Visual Status Banners */}
      {sheetStatus === "Approved" && (
        <Card className="border-0 shadow-sm ring-1 ring-emerald-200 bg-emerald-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-9 h-9 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-emerald-950 text-sm uppercase tracking-wide">
                Objectives Sheet Approved
              </h3>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Your goals for this cycle have been approved and locked. You can now start logging quarterly achievements in the Check-ins tab.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sheetStatus === "Pending Approval" && (
        <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-9 h-9 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 shadow-sm shrink-0">
              <LockKeyhole className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-amber-950 text-sm uppercase tracking-wide">
                Awaiting Manager Approval
              </h3>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Your goal sheet is submitted and locked. Your manager will review it. You will be notified once approved or returned.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sheetStatus === "Rejected" && (
        <Card className="border-0 shadow-sm ring-1 ring-red-200 bg-red-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-9 h-9 bg-red-100 border border-red-200 rounded-xl flex items-center justify-center text-red-600 shadow-sm shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-extrabold text-red-950 text-sm uppercase tracking-wide">
                Goal Sheet Revision Requested
              </h3>
              <p className="text-xs text-red-800 font-medium leading-relaxed">
                Your manager has returned your objectives for refinement. Please check their notes inside the cards, click "Unlock & Revise" to edit, and resubmit when ready.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full tracking-wider border border-blue-100">
              Q2 Goal Cycle
            </span>
            {isLocked && (
              <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full tracking-wider border border-slate-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" /> Locked Sheet
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Goal Sheet Management</h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed max-w-2xl text-left">
            This is your workspace to create, scope, and track your objectives. Ensure your total allocated weightage equals exactly 100% to submit your sheet.
          </p>
        </div>
        <div>
          <Button
            onClick={addGoal}
            disabled={goals.length >= 8 || remainingWeightage === 0}
            className={`gap-2 font-bold shadow-md hover:shadow-lg transition-all h-11 px-5 rounded-xl text-xs uppercase tracking-wider ${
              goals.length >= 8 || remainingWeightage === 0
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 cursor-pointer"
            }`}
          >
            {goals.length >= 8 || remainingWeightage === 0 ? <Lock className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4 text-white" />}
            + Add New Goal
          </Button>
        </div>
      </div>

      {/* Workspace Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Goals List Workspace */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Real-time Global Validation Alerts */}
          {!isLocked && validationErrors.length > 0 && totalWeightage > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-red-100 bg-red-50/20 overflow-hidden">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-red-700 text-xs">
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-red-800 text-left">
                    Draft Validation Status ({validationErrors.length} issues)
                  </p>
                  <ul className="list-disc pl-4 space-y-1 font-semibold text-red-600 text-left">
                    {validationErrors.slice(0, 3).map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li className="font-bold">
                        ...and {validationErrors.length - 3} other issue(s). Finalize all card edits.
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goal Cards */}
          {goals.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/30">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-blue-500">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">No Goals Created</h3>
                <p className="text-slate-500 text-xs max-w-sm mt-1.5 mb-6 leading-relaxed">
                  Start mapping your deliverables. Add a goal card, specify targets, allocate weights, and submit for manager alignment.
                </p>
                <Button onClick={addGoal} className="rounded-xl px-5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider h-10 shadow-sm cursor-pointer">
                  Create First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {goals.map((goal, index) => {
                const isEditing = editingGoalId === goal.id;
                const activeErrors = cardErrors[goal.id] || [];
                return (
                  <Card
                    key={goal.id}
                    className={`border-0 shadow-sm ring-1 transition-all overflow-hidden relative ${
                      isEditing
                        ? "ring-blue-500 bg-blue-50/5 shadow-lg shadow-blue-500/5 border-l-4 border-l-blue-600"
                        : isLocked
                        ? "ring-slate-100 bg-white"
                        : "ring-slate-200 hover:ring-blue-300 hover:shadow-md bg-white border-l-4 border-l-slate-400"
                    }`}
                  >
                    {/* Top Stripe Status Indicator */}
                    {goal.status === "Approved" && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />}
                    {goal.status === "Pending Approval" && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />}
                    {goal.status === "Rejected" && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />}

                    {isEditing ? (
                      /* ─── CARD IN EDIT MODE ─── */
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span className="text-xs uppercase font-extrabold text-blue-600 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Editing Goal #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 rounded-lg text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Goal
                          </Button>
                        </div>

                        {/* Inline Card Warnings */}
                        {activeErrors.length > 0 && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] font-semibold text-red-600 space-y-0.5 text-left">
                            {activeErrors.map((err, i) => (
                              <p key={i}>• {err}</p>
                            ))}
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 text-left">
                            <Label className="text-xs font-bold text-slate-700">
                              Thrust Area <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="e.g. Infrastructure, Revenue, Process"
                              value={goal.thrustArea}
                              onChange={e => updateGoalField(index, "thrustArea", e.target.value)}
                              className="h-10 rounded-lg text-xs font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-xs font-bold text-slate-700">
                              Goal Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="Brief title of the goal"
                              value={goal.title}
                              onChange={e => updateGoalField(index, "title", e.target.value)}
                              className="h-10 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <Label className="text-xs font-bold text-slate-700">Description</Label>
                          <Input
                            placeholder="What specific outcome will you achieve?"
                            value={goal.description || ""}
                            onChange={e => updateGoalField(index, "description", e.target.value)}
                            className="h-10 rounded-lg text-xs font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5 text-left">
                            <Label className="text-xs font-bold text-slate-700">Unit</Label>
                            <Select
                              value={goal.unit}
                              onChange={e => updateGoalField(index, "unit", e.target.value)}
                              className="h-10 rounded-lg text-xs font-semibold bg-white"
                            >
                              <option value="%">%</option>
                              <option value="Numeric">Numeric</option>
                              <option value="Timeline">Timeline</option>
                              <option value="Zero-based">Zero-based</option>
                            </Select>
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-xs font-bold text-slate-700">
                              Target <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="e.g. 100, Q3"
                              value={goal.target}
                              onChange={e => updateGoalField(index, "target", e.target.value)}
                              className="h-10 rounded-lg text-xs font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-xs font-bold text-slate-700">
                              Weightage (%) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              min={10}
                              max={100}
                              value={goal.weightage}
                              onChange={e => updateGoalField(index, "weightage", parseInt(e.target.value) || 0)}
                              className="h-10 rounded-lg text-xs font-semibold"
                            />
                            {goal.weightage < 10 && goal.weightage > 0 && (
                              <p className="text-[10px] text-red-500 font-semibold mt-0.5">Min 10%</p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                          <Button
                            variant="secondary"
                            onClick={() => cancelEditing(goal.id)}
                            className="rounded-lg h-9 px-4 text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => saveCard(goal.id)}
                            className="rounded-lg h-9 px-5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          >
                            Done Editing
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      /* ─── CARD IN READ MODE ─── */
                      <CardContent className="p-6 relative">
                        {/* Goal Card Header */}
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400 bg-slate-100 border border-slate-200/50 px-2.5 py-0.5 rounded-full tracking-wider">
                              Goal #{index + 1}
                            </span>
                            {goal.thrustArea && (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50 text-[9px] font-bold uppercase tracking-wider">
                                {goal.thrustArea}
                              </Badge>
                            )}
                            {goal.isShared && (
                              <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-700 text-[9px] font-bold uppercase tracking-wider">
                                Shared Alignment
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`border-0 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                                goal.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : goal.status === "Rejected"
                                  ? "bg-red-100 text-red-800"
                                  : goal.status === "Pending Approval"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-50 text-indigo-800"
                              }`}
                            >
                              {goal.status === "Approved" && <Check className="w-3 h-3 text-emerald-600" />}
                              {goal.status === "Pending Approval" && <Lock className="w-3 h-3 text-amber-600" />}
                              {goal.status === "Rejected" && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              {goal.status}
                            </Badge>
                            {goal.status === "Rejected" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRejected(goal.id, index)}
                                className="h-6 px-2.5 ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-blue-700 border-slate-200 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Edit & Resubmit
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1.5 pr-16 text-left">
                          <h3 className="font-extrabold text-slate-800 text-base leading-snug tracking-tight">
                            {goal.title || <span className="text-slate-400 font-medium italic">Untitled Objective Card</span>}
                          </h3>
                          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                            {goal.description || <span className="text-slate-400 italic">No description provided for this draft.</span>}
                          </p>
                        </div>

                        {/* Specs Panel */}
                        <div className="grid grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-100 text-xs font-semibold">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Target Objective</span>
                            <span className="text-slate-700 font-extrabold">
                              {goal.target || "N/A"} <span className="text-slate-400 font-medium">{goal.unit}</span>
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Weight Value</span>
                            <span className="text-slate-900 font-extrabold">{goal.weightage}%</span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Progress State</span>
                            <span className="text-slate-700 font-extrabold">{goal.progressStatus}</span>
                          </div>
                        </div>

                        {/* Manager Remarks */}
                        {goal.managerComments && (
                          <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-700 text-left">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-extrabold text-blue-800">Manager Notes:</strong> {goal.managerComments}
                            </div>
                          </div>
                        )}

                        {/* Floating Action Buttons (Only for Draft goals) */}
                        {goal.status === "Draft" && (
                          <div className="absolute top-5 right-5 flex items-center gap-1 bg-white/80 backdrop-blur-sm shadow-sm rounded-lg p-0.5 border border-slate-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(goal.id)}
                              className="w-7 h-7 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              title="Edit Goal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="w-7 h-7 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Goal Control Center Sidebar */}
        <div className="space-y-6">
          
          {/* Card: Current Status */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest text-left">
                Goal Sheet Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="flex justify-center">
                {sheetStatus === "Approved" ? (
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-500/10">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : sheetStatus === "Pending Approval" ? (
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-500/10">
                    <LockKeyhole className="w-7 h-7 animate-pulse" />
                  </div>
                ) : sheetStatus === "Rejected" ? (
                  <div className="w-14 h-14 bg-red-50 rounded-2xl border border-red-200 flex items-center justify-center text-red-600 shadow-sm shadow-red-500/10">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
                    <FileText className="w-7 h-7" />
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  {sheetStatus}
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold mt-1 leading-normal px-2">
                  {sheetStatus === "Approved" && "Your Q2 goal sheet is approved and active."}
                  {sheetStatus === "Pending Approval" && "Awaiting review and sign-off from your manager."}
                  {sheetStatus === "Rejected" && "Revision requested. Review comments on card and resubmit."}
                  {sheetStatus === "Draft" && "Draft mode. Define all targets and submit."}
                </p>
              </div>

              {sheetStatus === "Rejected" && (
                <Button
                  onClick={handleResubmit}
                  className="w-full gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider h-10 shadow-sm cursor-pointer"
                >
                  <Unlock className="w-4 h-4" /> Unlock & Revise
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Card: Weightage Tracker */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest text-left">
                Weightage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 space-y-5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${totalWeightage === 100 ? "bg-emerald-500" : totalWeightage > 100 ? "bg-red-500" : "bg-blue-500"}`} />
                  Allocated: <strong className="text-slate-800 font-extrabold">{totalWeightage}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${remainingWeightage === 0 ? "bg-slate-300" : "bg-indigo-500"}`} />
                  Remaining: <strong className="text-slate-800 font-extrabold">{remainingWeightage}%</strong>
                </span>
              </div>

              <Progress
                value={Math.min(totalWeightage, 100)}
                className={`h-3 rounded-full bg-slate-100 ${
                  totalWeightage === 100
                    ? "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500"
                    : totalWeightage > 100
                    ? "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-rose-500"
                    : "[&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-indigo-500"
                }`}
              />

              {/* Status Banner */}
              <div className={`p-3.5 rounded-xl border text-[11px] font-semibold leading-relaxed text-left ${
                totalWeightage === 100
                  ? "bg-emerald-50/60 border-emerald-100 text-emerald-700"
                  : totalWeightage > 100
                  ? "bg-red-50/60 border-red-100 text-red-700"
                  : "bg-blue-50/40 border-blue-100 text-blue-700"
              }`}>
                {totalWeightage === 100 ? (
                  <div className="flex gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Weightage totals 100%! Ready to submit for review.</span>
                  </div>
                ) : totalWeightage > 100 ? (
                  <div className="flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>Over-allocated! Reduce weights by {totalWeightage - 100}% to proceed.</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Please allocate {remainingWeightage}% more weightage across objectives.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Action Center */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest text-left">
                Action Center
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 space-y-3">
              {isEditingAny && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wide text-amber-700 flex items-start gap-2 text-left">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Complete editing your active goal card to save drafts or submit.</span>
                </div>
              )}
              
              <Button
                variant="secondary"
                disabled={isLocked || isEditingAny}
                onClick={handleSaveDraft}
                className="w-full gap-2 rounded-xl text-xs font-bold uppercase tracking-wider h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-500" /> Save Draft
              </Button>
              
              <Button
                disabled={isLocked || !isValid || isEditingAny || !goalWindowOpen}
                onClick={() => setConfirmSubmit(true)}
                title={!goalWindowOpen ? "Goal submission opens in April" : undefined}
                className={`w-full gap-2 rounded-xl text-xs font-bold uppercase tracking-wider h-11 text-white shadow-md transition-all cursor-pointer ${
                  isLocked || !isValid || isEditingAny || !goalWindowOpen
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-100"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15"
                }`}
              >
                <Send className="w-4 h-4" /> Submit Goal Sheet
              </Button>
              
              {isLocked && (
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center pt-1.5 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Sheet is Locked
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Validation Checklist */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest text-left">
                Validation Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-5 space-y-3.5 text-left">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                {totalWeightage === 100 ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={totalWeightage === 100 ? "font-extrabold text-slate-800" : ""}>
                  Total weightage equals 100%
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                {goals.length > 0 && goals.length <= 8 ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={goals.length > 0 && goals.length <= 8 ? "font-extrabold text-slate-800" : ""}>
                  Defined goals limit (1-8) ({goals.length}/8)
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                {goals.length > 0 && goals.every(g => g.title.trim() && g.thrustArea.trim() && g.target.trim()) ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={goals.length > 0 && goals.every(g => g.title.trim() && g.thrustArea.trim() && g.target.trim()) ? "font-extrabold text-slate-800" : ""}>
                  All goals have Title, Area & Target
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                {goals.length > 0 && goals.every(g => (Number(g.weightage) || 0) >= 10) ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={goals.length > 0 && goals.every(g => (Number(g.weightage) || 0) >= 10) ? "font-extrabold text-slate-800" : ""}>
                  Minimum weightage is 10% per card
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmSubmit}
        title="Submit Goals for Approval?"
        message="Once submitted, your objectives will be sent to your manager for alignment review and your sheet will be locked. You won't be able to edit weights until your manager approves or requests revisions."
        confirmLabel="Submit Goal Sheet"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
