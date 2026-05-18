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
import { PlusCircle, Trash2, Save, Send, Lock, CheckCircle2 } from "lucide-react";

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

  const isLocked = goals.some(g => g.status === "Pending Approval" || g.status === "Approved");
  const isRejected = goals.some(g => g.status === "Rejected");
  const totalWeightage = goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (goals.length === 0) errors.push("Add at least one goal.");
    if (totalWeightage !== 100) errors.push(`Total weightage must be exactly 100% (currently ${totalWeightage}%).`);
    goals.forEach((g, i) => {
      if (!g.title.trim()) errors.push(`Goal #${i + 1}: Title is required.`);
      if (!g.thrustArea.trim()) errors.push(`Goal #${i + 1}: Thrust area is required.`);
      if (!g.target.trim()) errors.push(`Goal #${i + 1}: Target is required.`);
      if ((g.weightage || 0) < 10) errors.push(`Goal #${i + 1}: Minimum weightage is 10%.`);
    });
    return errors;
  }, [goals, totalWeightage]);

  const isValid = validationErrors.length === 0;

  const addGoal = () => {
    if (goals.length >= 8) return;
    setGoals([...goals, emptyGoal(user!.id, user!.managerId || "")]);
  };

  const removeGoal = (index: number) => {
    if (goals.length <= 1) return;
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof Goal, value: any) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value, updatedAt: Date.now() };
    setGoals(updated);
  };

  const handleSaveDraft = async () => {
    const drafts = goals.map(g => ({ ...g, status: "Draft" as const }));
    try {
      await goalService.saveGoals(drafts);
      setGoals(drafts);
      toast("Draft saved successfully!", "success");
    } catch (e) {
      toast("Failed to save draft", "error");
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    const submitted = goals.map(g => ({ ...g, status: "Pending Approval" as const, locked: true }));
    try {
      await goalService.saveGoals(submitted);
      await Promise.all(submitted.map(g =>
        auditService.addAuditLog({
          entityType: "goal", entityId: g.id, changedBy: user!.id,
          action: "SUBMIT_GOAL",
          previousValue: { status: "Draft" },
          updatedValue: { status: "Pending Approval" },
        })
      ));
      setGoals(submitted);
      setConfirmSubmit(false);
      toast("Goals submitted for manager approval!", "success");
    } catch (e) {
      toast("Failed to submit goals", "error");
    }
  };

  const handleResubmit = async () => {
    // Reset rejected goals to draft for editing
    const reset = goals.map(g => ({ ...g, status: "Draft" as const, locked: false }));
    try {
      await goalService.saveGoals(reset);
      setGoals(reset);
      toast("Goals unlocked for editing.", "info");
    } catch (e) {
      toast("Failed to unlock goals", "error");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  // ─── Locked State ───
  if (isLocked) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Goals</h1>
            <p className="text-sm text-muted-foreground">Your goal sheet has been submitted.</p>
          </div>
          <Badge className={goals[0]?.status === "Approved" ? "bg-emerald-500" : "bg-amber-500 border-0"} variant="default">
            <Lock className="w-3 h-3 mr-1" />
            {goals[0]?.status}
          </Badge>
        </div>

        {goals[0]?.status === "Approved" && (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800 text-sm">Goals Approved</p>
                <p className="text-xs text-emerald-600">You can now update progress in the Check-ins page.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {goals.map((g, i) => (
            <Card key={g.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{g.thrustArea}</p>
                    <h4 className="font-semibold">{g.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{g.weightage}%</span>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Target: {g.target} ({g.unit})</span>
                  <span>Progress: {g.progressStatus}</span>
                </div>
                {g.managerComments && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <strong>Manager:</strong> {g.managerComments}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Rejected State ───
  if (isRejected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Goals</h1>
            <p className="text-sm text-red-500 font-medium">Your goals were rejected by your manager.</p>
          </div>
          <Button onClick={handleResubmit}>Edit & Resubmit</Button>
        </div>
        <div className="space-y-3">
          {goals.map(g => (
            <Card key={g.id} className="border-red-200">
              <CardContent className="pt-5 pb-4">
                <h4 className="font-semibold">{g.title}</h4>
                <p className="text-xs text-muted-foreground">{g.thrustArea} • {g.weightage}%</p>
                {g.managerComments && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                    <strong>Manager Feedback:</strong> {g.managerComments}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Edit State ───
  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goal Setting</h1>
          <p className="text-sm text-muted-foreground">Create up to 8 goals. Total weightage must equal 100%.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total Weightage</div>
          <div className={`text-2xl font-bold ${totalWeightage === 100 ? "text-emerald-600" : totalWeightage > 100 ? "text-red-500" : "text-primary"}`}>
            {totalWeightage}%
          </div>
        </div>
      </div>

      <Progress
        value={Math.min(totalWeightage, 100)}
        className={`h-2 ${totalWeightage > 100 ? "[&>div]:bg-red-500" : totalWeightage === 100 ? "[&>div]:bg-emerald-500" : ""}`}
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 && totalWeightage > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs space-y-1">
          {validationErrors.slice(0, 3).map((e, i) => (
            <p key={i} className="text-red-600">• {e}</p>
          ))}
          {validationErrors.length > 3 && (
            <p className="text-red-400">...and {validationErrors.length - 3} more issues</p>
          )}
        </div>
      )}

      {/* Goal Forms */}
      <div className="space-y-4">
        {goals.map((goal, index) => (
          <Card key={goal.id} className="border-l-4 border-l-primary/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Goal #{index + 1}</CardTitle>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => removeGoal(index)}
                  disabled={goals.length <= 1}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Thrust Area <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Innovation, Revenue, Process"
                    value={goal.thrustArea}
                    onChange={e => updateGoal(index, "thrustArea", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Goal Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="Brief title of the goal"
                    value={goal.title}
                    onChange={e => updateGoal(index, "title", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input placeholder="What will you achieve?"
                  value={goal.description}
                  onChange={e => updateGoal(index, "description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit of Measurement</Label>
                  <Select value={goal.unit} onChange={e => updateGoal(index, "unit", e.target.value)}>
                    <option value="%">%</option>
                    <option value="Numeric">Numeric</option>
                    <option value="Timeline">Timeline</option>
                    <option value="Zero-based">Zero-based</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. 100, Q3"
                    value={goal.target}
                    onChange={e => updateGoal(index, "target", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weightage (%) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={10} max={100}
                    value={goal.weightage}
                    onChange={e => updateGoal(index, "weightage", parseInt(e.target.value) || 0)}
                  />
                  {goal.weightage < 10 && goal.weightage > 0 && (
                    <p className="text-[10px] text-red-500">Min 10%</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shadow-lg z-40">
        <Button variant="outline" onClick={addGoal} disabled={goals.length >= 8} className="gap-2 text-xs">
          <PlusCircle className="w-3.5 h-3.5" /> Add Goal ({goals.length}/8)
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSaveDraft} className="gap-2 text-xs">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button onClick={() => setConfirmSubmit(true)} disabled={!isValid} className="gap-2 text-xs">
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmSubmit}
        title="Submit Goals?"
        message="Once submitted, your goals will be locked and sent to your manager for review. You won't be able to edit them until they are approved or rejected."
        confirmLabel="Submit Goals"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
