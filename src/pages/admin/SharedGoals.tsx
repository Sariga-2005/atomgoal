import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { SharedGoal, UnitOfMeasurement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Share2 } from "lucide-react";

export default function SharedGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ department: "Engineering", thrustArea: "", title: "", description: "", unit: "%" as UnitOfMeasurement, target: "" });

  const fetchSharedGoals = async () => {
    try {
      const goals = await goalService.getSharedGoals();
      setSharedGoals(goals);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedGoals();
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.thrustArea || !form.target) {
      toast("Fill in all required fields.", "error");
      return;
    }
    const sg: SharedGoal = {
      id: Math.random().toString(36).substring(2, 9),
      department: form.department,
      thrustArea: form.thrustArea,
      title: form.title,
      description: form.description,
      unit: form.unit,
      target: form.target,
      createdAt: Date.now(),
    };
    try {
      await goalService.saveSharedGoal(sg);
      await auditService.addAuditLog({
        entityType: "goal", entityId: sg.id, changedBy: user!.id,
        action: "CREATE_SHARED_GOAL",
        previousValue: null,
        updatedValue: { title: sg.title, department: sg.department },
      });
      setForm({ department: "Engineering", thrustArea: "", title: "", description: "", unit: "%", target: "" });
      setShowForm(false);
      fetchSharedGoals();
      toast("Shared goal created! Employees can now see it.", "success");
    } catch (e) {
      toast("Failed to create shared goal", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shared Goals</h1>
          <p className="text-sm text-muted-foreground">Push departmental KPIs that employees must include</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 text-xs">
          <PlusCircle className="w-3.5 h-3.5" /> New Shared Goal
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Create Shared Goal</CardTitle>
            <CardDescription className="text-xs">Employees can only edit weightage. Title and target are read-only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                  <option value="Finance">Finance</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thrust Area <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Org Health" value={form.thrustArea} onChange={e => setForm({ ...form, thrustArea: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Goal Title <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Achieve 95% employee satisfaction" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input placeholder="Additional context..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value as UnitOfMeasurement })}>
                  <option value="%">%</option>
                  <option value="Numeric">Numeric</option>
                  <option value="Timeline">Timeline</option>
                  <option value="Zero-based">Zero-based</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. 95" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
              <Button onClick={handleCreate} className="text-xs gap-2"><Share2 className="w-3 h-3" /> Push Goal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Thrust Area</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sharedGoals.map(sg => (
                <TableRow key={sg.id}>
                  <TableCell className="text-sm">{sg.department}</TableCell>
                  <TableCell className="text-sm">{sg.thrustArea}</TableCell>
                  <TableCell className="text-sm font-medium">{sg.title}</TableCell>
                  <TableCell className="text-sm">{sg.target} ({sg.unit})</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(sg.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {sharedGoals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No shared goals yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
