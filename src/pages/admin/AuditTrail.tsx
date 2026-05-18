import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { auditService } from "@/services";
import { AuditLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings, Search, Download, RefreshCw, Calendar, ClipboardList,
  Eye, EyeOff, AlertCircle, ArrowUpDown
} from "lucide-react";

export default function AuditTrail() {
  const { allUsers } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

  // Sorting & Pagination
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Payload detail modal simulation
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch governance audit logs:", e);
      toast("Error fetching audit logs", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter application
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(log => {
        const who = allUsers.find(u => u.id === log.changedBy);
        const nameMatch = who?.name.toLowerCase().includes(q) || false;
        const emailMatch = who?.email.toLowerCase().includes(q) || false;
        const actionMatch = log.action.toLowerCase().includes(q);
        const idMatch = log.entityId.toLowerCase().includes(q);
        return nameMatch || emailMatch || actionMatch || idMatch;
      });
    }

    // Entity Filter
    if (entityFilter !== "all") {
      result = result.filter(log => log.entityType === entityFilter);
    }

    // Sorting
    result.sort((a, b) => {
      return sortDirection === "asc" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    });

    return result;
  }, [logs, searchQuery, entityFilter, allUsers, sortDirection]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredLogs, totalPages, currentPage]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast("No events to export", "info");
      return;
    }

    const headers = ["Timestamp", "Operator", "Email", "Entity Type", "Entity ID", "Action Actioned", "Previous Payload", "Updated Payload"];
    const rows = filteredLogs.map(log => {
      const who = allUsers.find(u => u.id === log.changedBy);
      return [
        new Date(log.timestamp).toISOString(),
        who?.name || "System Operator",
        who?.email || log.changedBy,
        log.entityType,
        log.entityId,
        log.action,
        log.previousValue ? JSON.stringify(log.previousValue) : "N/A",
        JSON.stringify(log.updatedValue)
      ];
    });

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "AtomGoal_AuditLogs.csv";
    link.click();
    toast("CSV export complete!", "success");
  };

  return (
    <div className="space-y-8 animate-slide-in pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-600" /> Compliance Audit Trails
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Immutable corporate ledger auditing structural updates, target edits, and check-in reviews.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Force Sync
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV Trails
          </button>
        </div>
      </div>

      {/* Advanced search and filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl ring-1 ring-slate-200/60 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search action keyword, operator email, or entity ID..."
            className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:border-blue-500 text-slate-800 rounded-xl text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="h-10 border-slate-200 bg-slate-50/50 text-slate-800 rounded-xl text-xs"
          >
            <option value="all">All Scoped Entities</option>
            <option value="goal">Goal Sheets</option>
            <option value="checkin">Quarterly Check-ins</option>
            <option value="user">User Clearances</option>
          </Select>
        </div>
      </div>

      {/* Audit Log Card Table */}
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
                    <TableHead
                      onClick={() => setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))}
                      className="cursor-pointer py-3 text-slate-600 font-bold text-xs uppercase tracking-wider select-none hover:text-slate-900 group"
                    >
                      <span className="flex items-center gap-1.5 pl-4">
                        Timestamp (UTC)
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider">Operator Profile</TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider text-center">Entity Scope</TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider text-center">Action Actioned</TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider text-center">Previous Value</TableHead>
                    <TableHead className="py-3 text-slate-600 font-bold text-xs uppercase tracking-wider text-center">New value</TableHead>
                    <TableHead className="py-3 text-right pr-6 text-slate-600 font-bold text-xs uppercase tracking-wider">Payload Inspect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {paginatedLogs.map(log => {
                    const who = allUsers.find(u => u.id === log.changedBy);
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <TableRow className="hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="py-4 font-semibold text-slate-500 pl-4 whitespace-nowrap">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] uppercase">
                                {(who?.name || log.changedBy).charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800">{who?.name || "System"}</p>
                                <p className="text-[9px] text-slate-400 font-medium">{who?.email || log.changedBy}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              log.entityType === "goal" ? "bg-blue-100 text-blue-800" :
                              log.entityType === "checkin" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {log.entityType}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <Badge className="bg-slate-100 text-slate-700 font-bold border-0 text-[10px] tracking-wide uppercase">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-4 text-center text-[10px] text-slate-400 font-medium max-w-[120px] truncate">
                            {log.previousValue ? JSON.stringify(log.previousValue) : "—"}
                          </td>
                          <td className="py-4 text-center text-[10px] text-slate-500 font-semibold max-w-[120px] truncate">
                            {JSON.stringify(log.updatedValue)}
                          </td>
                          <td className="py-4 text-right pr-6">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" /> Collapse
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" /> Inspect
                                </>
                              )}
                            </button>
                          </td>
                        </TableRow>

                        {/* Collapsible inspect details card */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/50">
                            <td colSpan={7} className="p-5 border-t border-b border-slate-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Original State Payload</span>
                                  <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-slate-900 leading-normal max-h-36">
                                    {log.previousValue ? JSON.stringify(log.previousValue, null, 2) : "Null state reference"}
                                  </pre>
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Modified Audit Payload</span>
                                  <pre className="p-3 bg-slate-950 text-blue-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-slate-900 leading-normal max-h-36">
                                    {JSON.stringify(log.updatedValue, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Empty state */}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <AlertCircle className="w-10 h-10 text-slate-300" />
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">No matching logs found</h4>
                          <p className="text-xs text-slate-400">
                            Refine your search parameters or query a different entity scope to retrieve historical logs.
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

      {/* Pagination Footer */}
      {!isLoading && filteredLogs.length > 0 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl ring-1 ring-slate-200/60 shadow-sm relative z-10">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-700">{(currentPage - 1) * rowsPerPage + 1}</span> to{" "}
            <span className="font-bold text-slate-700">
              {Math.min(currentPage * rowsPerPage, filteredLogs.length)}
            </span>{" "}
            of <span className="font-bold text-slate-700">{filteredLogs.length}</span> events
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
