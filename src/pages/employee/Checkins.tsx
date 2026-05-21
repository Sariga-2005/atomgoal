import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { Goal, ProgressStatus, QuarterlyCheckin } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckSquare, Save } from "lucide-react";
import { computeProgressScore, getScoreColor } from "@/lib/progress";
import { getCurrentActiveWindow, getNextOpenWindow } from "@/lib/temporal";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export default function Checkins() {
  const { user } = useAuth();
  const [windowInfo, setWindowInfo] = React.useState<{ phase: string; quarter: string | null; isOpen: boolean }>({ phase: "", quarter: null, isOpen: false });
  const { toast } = useToast();
  const [selectedQuarter, setSelectedQuarter] = useState<typeof QUARTERS[number]>("Q2");
  const nextWindow = getNextOpenWindow();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkinData, setCheckinData] = useState<Record<string, { achievement: string; progressStatus: ProgressStatus; comments: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Determine active window on mount
    const info = getCurrentActiveWindow();
    setWindowInfo(info);
    if (info.quarter) setSelectedQuarter(info.quarter as typeof QUARTERS[number]);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchCheckinData = async () => {
      try {
        const userGoals = (await goalService.getGoals(user.id)).filter(g => g.status === "Approved");
        setGoals(userGoals);

        const data: typeof checkinData = {};
        await Promise.all(userGoals.map(async g => {
          const checkins = await goalService.getCheckins(g.id);
          const existing = checkins.find(c => c.quarter === selectedQuarter);
          data[g.id] = {
            achievement: existing?.achievement || g.achievement || "",
            progressStatus: existing?.progressStatus || g.progressStatus || "Not Started",
            comments: existing?.employeeComments || "",
          };
        }));
        setCheckinData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
    // If window is closed, prevent further edits
    if (!windowInfo.isOpen) {
      toast("Check‑in window is closed. Submissions are disabled.", "error");
    }
      }
    };
    fetchCheckinData();
  }, [user, selectedQuarter]);

  const updateCheckin = (goalId: string, field: string, value: string) => {
    setCheckinData(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!windowInfo.isOpen) {
      toast("Cannot submit: check‑in window is closed.", "error");
      return;
    }
    try {
      await Promise.all(goals.map(async g => {
        const d = checkinData[g.id];
        if (!d) return;

        const checkin: QuarterlyCheckin = {
          id: `${g.id}_${selectedQuarter}_${new Date().getFullYear()}`,
          goalId: g.id,
          userId: user!.id,
          quarter: selectedQuarter,
          year: new Date().getFullYear(),
          achievement: d.achievement,
          progressStatus: d.progressStatus as ProgressStatus,
          employeeComments: d.comments,
          status: "Pending Review",
          submittedAt: Date.now(),
        };

        await goalService.saveCheckin(checkin);

        // Update the goal's progress in database
        const updated = {
          ...g,
          achievement: d.achievement,
          progressStatus: d.progressStatus as ProgressStatus,
          updatedAt: Date.now()
        };
        await goalService.saveGoal(updated);

        await auditService.addAuditLog({
          entityType: "checkin",
          entityId: checkin.id,
          changedBy: user!.id,
          action: "SUBMIT_QUARTERLY_CHECKIN",
          previousValue: { quarter: selectedQuarter },
          updatedValue: { achievement: d.achievement, progressStatus: d.progressStatus, status: "Pending Review" },
        });
      }));
      toast("Quarterly check-in submitted for manager review!", "success");
    } catch (e) {
      toast("Failed to submit check-in", "error");
    }
  };

  if (goals.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Quarterly Check-ins</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No Approved Goals</h3>
            <p className="text-sm text-muted-foreground">Check-ins are available once your goals are approved by your manager.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quarterly Check-ins</h1>
          <p className="text-sm text-muted-foreground">Update your achievement and progress for each goal</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value as typeof QUARTERS[number])} className="w-24" disabled={!windowInfo.isOpen}>
            {QUARTERS.map(q => <option key={q} value={q}>{q} {new Date().getFullYear()}</option>)}
          </Select>
          <Button
            onClick={handleSave}
            className="gap-2"
            disabled={!windowInfo.isOpen}
            title={!windowInfo.isOpen ? `Check‑in window is closed. Next: ${nextWindow.label} (${nextWindow.opensIn})` : "Submit your check‑in"}
          >
            <Save className="w-4 h-4" /> Save Check-in
          </Button>
        </div>
      </div>

      {!windowInfo.isOpen && (
        <div className="p-4 mb-4 text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded">
          Check‑in window is currently closed. You can view existing entries but cannot submit new data.
        </div>
      )}
      <div className="space-y-4">
        {goals.map(g => {
          const d = checkinData[g.id] || { achievement: "", progressStatus: "Not Started", comments: "" };
          return (
            <Card key={g.id}>
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{g.thrustArea}</p>
                    <CardTitle className="text-sm">{g.title}</CardTitle>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{g.weightage}% weight</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Target: {g.target} ({g.unit})</p>
                    {/* Progress Score Badge */}
                    {d.achievement && (
                      (() => {
                        const score = computeProgressScore(g.unit, d.achievement, g.target, { direction: g.scoringDirection, deadline: g.deadline ? new Date(g.deadline) : undefined });
                        const colors = getScoreColor(score);
                        return (
                          <span className={`${colors.bg} ${colors.text} ${colors.border} border px-2 py-0.5 text-xs font-medium rounded ml-2`}>Score: {Math.round(score)}%</span>
                        );
                      })()
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Achievement</Label>
                    <Input
                      placeholder={`e.g. ${g.target}`}
                      value={d.achievement}
                      onChange={e => updateCheckin(g.id, "achievement", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Progress Status</Label>
                    <Select value={d.progressStatus} onChange={e => updateCheckin(g.id, "progressStatus", e.target.value)}>
                      <option value="Not Started">Not Started</option>
                      <option value="On Track">On Track</option>
                      <option value="Completed">Completed</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Comments</Label>
                    <Input
                      placeholder="Update notes..."
                      value={d.comments}
                      onChange={e => updateCheckin(g.id, "comments", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
