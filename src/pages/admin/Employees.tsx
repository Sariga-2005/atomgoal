import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { goalService, auditService } from "@/services";
import { Goal, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Unlock, Lock, Users, Search, Download, ChevronUp, ChevronDown,
  ArrowUpDown, CheckSquare, Square, Trash, Settings, RefreshCw, AlertCircle
} from "lucide-react";

interface EmployeeDataExtended extends User {
  totalGoals: number;
  approved: number;
  locked: boolean;
  completed: number;
  goals: Goal[];
}

export default function Employees() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [employeeData, setEmployeeData] = useState<EmployeeDataExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sorting States
  const [sortField, setSortField] = useState<"name" | "totalGoals" | "approved" | "completed" | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);

  const fetchEmployeesData = async () => {
    setIsLoading(true);
    const employees = allUsers.filter(u => u.role === "employee");
    try {
      const extendedData = await Promise.all(employees.map(async emp => {
        const goals = await goalService.getGoals(emp.id);
        const totalGoals = goals.length;
        const approved = goals.filter(g => g.status === "Approved").length;
        const locked = goals.some(g => g.locked);
        const completed = goals.filter(g => g.progressStatus === "Completed").length;
        return { ...emp, totalGoals, approved, locked, completed, goals };
      }));
      setEmployeeData(extendedData);
    } catch (e) {
      console.error("Failed to load employee list details:", e);
      toast("Error compiling rosters", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allUsers.length > 0) {
      fetchEmployeesData();
    }
  }, [allUsers]);

  // Debounced/Triggered Search & Filters application
  const filteredEmployees = useMemo(() => {
    let result = [...employeeData];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(emp =>
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    }

    // Department Filter
    if (deptFilter !== "all") {
      result = result.filter(emp => emp.department === deptFilter);
    }

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "locked") result = result.filter(emp => emp.locked);
      else if (statusFilter === "editable") result = result.filter(emp => !emp.locked && emp.totalGoals > 0);
      else if (statusFilter === "no_goals") result = result.filter(emp => emp.totalGoals === 0);
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let aValue: any = a[sortField as keyof EmployeeDataExtended] || 0;
        let bValue: any = b[sortField as keyof EmployeeDataExtended] || 0;

        if (sortField === "name") {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employeeData, searchQuery, deptFilter, statusFilter, sortField, sortDirection]);

  // Pagination processing
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredEmployees.slice(start, start + rowsPerPage);
  }, [filteredEmployees, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage) || 1;

  useEffect(() => {
    // Reset page if filters push current page out of bounds
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredEmployees, totalPages, currentPage]);

  // Handle Sort triggering
  const handleSort = (field: "name" | "totalGoals" | "approved" | "completed") => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Selection managers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedEmployees.map(e => e.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Single Unlock handler
  const handleUnlock = async (empId: string) => {
    const emp = employeeData.find(e => e.id === empId);
    if (!emp) return;
    try {
      const updatedGoals = emp.goals.map(g => ({ ...g, locked: false, status: "Draft" as const }));
      await goalService.saveGoals(updatedGoals);
      await Promise.all(updatedGoals.map(g =>
        auditService.addAuditLog({
          entityType: "goal", entityId: g.id, changedBy: user!.id,
          action: "ADMIN UNLOCKED GOAL",
          previousValue: { locked: true, status: "Locked" },
          updatedValue: { locked: false, status: "Draft" },
        })
      ));
      toast(`Unlocked Q2 OKRs for ${emp.name}`, "success");
      fetchEmployeesData();
    } catch (e) {
      toast("Failed to unlock objectives", "error");
    }
  };

  // Bulk Unlock Action
  const handleBulkUnlock = async () => {
    if (selectedIds.length === 0) return;
    try {
      let count = 0;
      await Promise.all(
        selectedIds.map(async empId => {
          const emp = employeeData.find(e => e.id === empId);
          if (emp && emp.locked) {
            const updated = emp.goals.map(g => ({ ...g, locked: false, status: "Draft" as const }));
            await goalService.saveGoals(updated);
            await Promise.all(updated.map(g =>
              auditService.addAuditLog({
                entityType: "goal", entityId: g.id, changedBy: user!.id,
                action: "ADMIN BULK UNLOCKED GOALS",
                previousValue: { locked: true },
                updatedValue: { locked: false }
              })
            ));
            count++;
          }
        })
      );
      toast(`Bulk unlocked OKRs for ${count} employee(s)`, "success");
      setSelectedIds([]);
      fetchEmployeesData();
    } catch (e) {
      toast("Bulk action failed", "error");
    }
  };

  // Export CSV (supporting all or filtered selection)
  const handleExportCSV = (exportSelected = false) => {
    const targets = exportSelected
      ? employeeData.filter(e => selectedIds.includes(e.id))
      : filteredEmployees;

    if (targets.length === 0) {
      toast("No records available to export", "info");
      return;
    }

    const headers = ["Employee", "Department", "Goal Title", "Thrust Area", "Weightage", "Target", "Status", "Progress"];
    const rows = targets.flatMap(emp =>
      emp.goals.length > 0
        ? emp.goals.map(g => [emp.name, emp.department, g.title, g.thrustArea, `${g.weightage}%`, g.target, g.status, g.progressStatus])
        : [[emp.name, emp.department, "No Goals Initialized", "-", "-", "-", "-", "-"]]
    );

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AtomGoal_Roster_${exportSelected ? "Selection" : "All"}.csv`;
    link.click();
    toast("CSV file downloaded!", "success");
  };

  return (
    <div className="space-y-8 animate-slide-in pb-12">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" /> Team Directories
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Monitor organizational objectives, manage locked planning sheets, and audit roster statuses.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmployeesData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() => handleExportCSV(false)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export All CSV
          </button>
        </div>
      </div>

      {/* Advanced Search & Filtering Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl ring-1 ring-slate-200/60 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search name, email, or department..."
            className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:border-blue-500 text-slate-800 rounded-xl text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-10 border-slate-200 bg-slate-50/50 text-slate-800 rounded-xl text-xs"
          >
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR & Culture</option>
            <option value="Product">Product</option>
            <option value="Sales">Sales & Growth</option>
          </Select>
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 border-slate-200 bg-slate-50/50 text-slate-800 rounded-xl text-xs"
          >
            <option value="all">All Goal States</option>
            <option value="locked">Locked Sheet</option>
            <option value="editable">Editable Scoped</option>
            <option value="no_goals">No Goals Setup</option>
          </Select>
        </div>
      </div>

      {/* Bulk Action Drawer (Visible only when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-150 rounded-2xl animate-fade-in relative z-10">
          <div className="flex items-center gap-2.5 text-xs font-bold text-blue-900">
            <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Selected {selectedIds.length} employee(s) for administrative actions</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportCSV(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-800 hover:text-blue-950 bg-white border border-blue-200 rounded-xl cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Selected
            </button>
            <button
              onClick={handleBulkUnlock}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer shadow-md transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" /> Unlock Sheets
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 cursor-pointer"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Roster Data Card Table */}
      <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 space-y-4">
              <div className="h-8 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              <Table className="w-full">
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-12 text-center py-3">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                        {selectedIds.length === paginatedEmployees.length && paginatedEmployees.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead onClick={() => handleSort("name")} className="cursor-pointer py-3 text-slate-600 font-bold text-xs uppercase tracking-wider select-none hover:text-slate-900 group">
                      <span className="flex items-center gap-1.5">
                        Employee Name
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider">Department</TableHead>
                    <TableHead onClick={() => handleSort("totalGoals")} className="cursor-pointer py-3 text-slate-600 font-bold text-xs uppercase tracking-wider select-none hover:text-slate-900 group text-center">
                      <span className="flex items-center gap-1.5 justify-center">
                        Scoped goals
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </TableHead>
                    <TableHead onClick={() => handleSort("approved")} className="cursor-pointer py-3 text-slate-600 font-bold text-xs uppercase tracking-wider select-none hover:text-slate-900 group text-center">
                      <span className="flex items-center gap-1.5 justify-center">
                        Approved OKRs
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </TableHead>
                    <TableHead onClick={() => handleSort("completed")} className="cursor-pointer py-3 text-slate-600 font-bold text-xs uppercase tracking-wider select-none hover:text-slate-900 group text-center">
                      <span className="flex items-center gap-1.5 justify-center">
                        Completed OKRs
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider">Goal Sheet status</TableHead>
                    <TableHead className="py-3 text-right pr-6 text-slate-600 font-bold text-xs uppercase tracking-wider">Unlock controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {paginatedEmployees.map(emp => (
                    <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="text-center py-4">
                        <button onClick={() => handleSelectRow(emp.id)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                          {selectedIds.includes(emp.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-xs uppercase shadow-sm">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-slate-600">{emp.department}</td>
                      <td className="py-4 text-center font-bold text-slate-800 text-sm">{emp.totalGoals}</td>
                      <td className="py-4 text-center font-bold text-emerald-600 text-sm">{emp.approved}</td>
                      <td className="py-4 text-center font-bold text-indigo-600 text-sm">{emp.completed}</td>
                      <td className="py-4">
                        {emp.locked ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold uppercase tracking-wider gap-1">
                            <Lock className="w-2.5 h-2.5 shrink-0" /> Locked sheet
                          </Badge>
                        ) : emp.totalGoals > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold uppercase tracking-wider gap-1">
                            <Unlock className="w-2.5 h-2.5 shrink-0" /> Editable Draft
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                            No Scopes Set
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 text-right pr-6">
                        {emp.locked ? (
                          <button
                            onClick={() => handleUnlock(emp.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100/75 rounded-xl cursor-pointer transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Unlock goals
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic pr-2">Clear permissions</span>
                        )}
                      </td>
                    </TableRow>
                  ))}

                  {/* Empty State */}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <AlertCircle className="w-10 h-10 text-slate-300" />
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">No matching employees found</h4>
                          <p className="text-xs text-slate-400">
                            Refine your search parameters or select a different department grouping to discover matching profiles.
                          </p>
                        </div>
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Footer Controls */}
      {!isLoading && filteredEmployees.length > 0 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl ring-1 ring-slate-200/60 shadow-sm relative z-10">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-700">{(currentPage - 1) * rowsPerPage + 1}</span> to{" "}
            <span className="font-bold text-slate-700">
              {Math.min(currentPage * rowsPerPage, filteredEmployees.length)}
            </span>{" "}
            of <span className="font-bold text-slate-700">{filteredEmployees.length}</span> profiles
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-xl cursor-pointer select-none transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold px-2">
              <span className="text-blue-600">{currentPage}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">{totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-xl cursor-pointer select-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
