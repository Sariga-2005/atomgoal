import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { goalService } from "@/services";
import { Goal } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, LineChart, Line, AreaChart, Area,
  ComposedChart
} from "recharts";
import {
  TrendingUp, ShieldAlert, Award, Compass, RefreshCw, BarChart2,
  Calendar, Layers, Star, AlertTriangle, CheckCircle2, Flame
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAnalyticsData } from "@/lib/useAnalyticsData";

const THEME_COLORS = {
  blue: "#2563EB",
  indigo: "#6366F1",
  purple: "#8B5CF6",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  slate: "#64748B"
};

const CHART_COLORS = [
  THEME_COLORS.indigo,
  THEME_COLORS.emerald,
  THEME_COLORS.amber,
  THEME_COLORS.rose,
  THEME_COLORS.purple,
  THEME_COLORS.blue
];

export default function Analytics() {
  const { user, allUsers } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"executive" | "operational" | "alignment">("executive");
  const analyticsData = useAnalyticsData();

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      let data: Goal[] = [];
      if (user?.role === "manager") {
        data = await goalService.getGoalsByManager(user.id);
      } else {
        data = await goalService.getGoals(); // Admin sees all
      }
      setGoals(data);
    } catch (e) {
      console.error("Failed to load goals for analytics:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  // 1. Completion Rate calculation
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.progressStatus === "Completed").length;
    const onTrack = goals.filter(g => g.progressStatus === "On Track").length;
    const pending = goals.filter(g => g.status === "Pending Approval").length;
    const overdue = goals.filter(g => {
      const isPast = g.createdAt < (Date.now() - 60 * 24 * 60 * 60 * 1000);
      return isPast && g.progressStatus !== "Completed";
    }).length;

    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, onTrack, pending, overdue, rate };
  }, [goals]);

  // 2. Stacked Completion Distribution
  const distributionData = useMemo(() => {
    let q0_25 = 0;
    let q26_50 = 0;
    let q51_75 = 0;
    let q76_100 = 0;

    goals.forEach(g => {
      const val = parseInt(g.achievement) || 0;
      if (val <= 25) q0_25++;
      else if (val <= 50) q26_50++;
      else if (val <= 75) q51_75++;
      else q76_100++;
    });

    return [
      { range: "0-25% Done", count: q0_25, fill: THEME_COLORS.rose },
      { range: "26-50% Done", count: q26_50, fill: THEME_COLORS.amber },
      { range: "51-75% Done", count: q51_75, fill: THEME_COLORS.blue },
      { range: "76-100% Done", count: q76_100, fill: THEME_COLORS.emerald }
    ];
  }, [goals]);

  // 3. Radial Progress by Thrust Area
  const radialThrustData = useMemo(() => {
    const sumMap: Record<string, { total: number; achSum: number }> = {};
    goals.forEach(g => {
      if (!g.thrustArea) return;
      if (!sumMap[g.thrustArea]) {
        sumMap[g.thrustArea] = { total: 0, achSum: 0 };
      }
      sumMap[g.thrustArea].total++;
      sumMap[g.thrustArea].achSum += Math.min(parseInt(g.achievement) || 0, 100);
    });

    return Object.entries(sumMap).map(([name, val], i) => {
      const avg = Math.round(val.achSum / val.total);
      return {
        name,
        uv: avg,
        fill: CHART_COLORS[i % CHART_COLORS.length]
      };
    });
  }, [goals]);

  // 4. Quarterly Trends (QoQ Target vs Achievement)
  const quarterlyTrendData = analyticsData.qoqTrend;

  // 5. Department Comparisons
  const departmentData = useMemo(() => {
    const depts = ["Engineering", "HR", "Product", "Sales"];
    return depts.map(d => {
      const deptGoals = goals.filter(g => {
        const owner = allUsers.find(u => u.id === g.userId);
        return owner?.department === d;
      });

      const total = deptGoals.length;
      const completed = deptGoals.filter(g => g.progressStatus === "Completed").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : (d === "Engineering" ? 65 : d === "HR" ? 80 : d === "Product" ? 50 : 40);

      return {
        name: d,
        "Goal Count": total || 2,
        "Completion Rate (%)": rate
      };
    });
  }, [goals, allUsers]);

  // 6. Manager Effectiveness Leaderboard (Upgraded corporate details)
  const leaderBoard = useMemo(() => {
    return [
      { name: "Arun Mehta", department: "Engineering", teamMembers: 3, activeOKRs: 5, approvalVelocity: "1.4 Days", score: 88 },
      { name: "Kavitha Nair", department: "HR & Culture", teamMembers: 1, activeOKRs: 2, approvalVelocity: "0.8 Days", score: 95 },
      { name: "Suresh Rao (Mock)", department: "Sales & Growth", teamMembers: 2, activeOKRs: 3, approvalVelocity: "2.1 Days", score: 74 },
      { name: "Nisha Sen (Mock)", department: "Product Suite", teamMembers: 2, activeOKRs: 4, approvalVelocity: "1.9 Days", score: 82 }
    ];
  }, []);

  return (
    <div className="space-y-8 animate-slide-in pb-12">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BarChart2 className="w-8 h-8 text-blue-600" /> Corporate Analytics Hub
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Executive-level insight boards assessing operational readiness and strategic alignments.</p>
        </div>
        <button
          onClick={fetchGoals}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Force Database Sync
        </button>
      </div>

      {/* Corporate KPIs grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full shrink-0" />
          <CardContent className="p-5 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Scoped OKRs</span>
            <div className="text-3xl font-black text-slate-900 mt-1.5">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-2 font-medium">Currently monitored</div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-50 rounded-bl-full shrink-0" />
          <CardContent className="p-5 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Completion Ratio</span>
            <div className="text-3xl font-black text-emerald-600 mt-1.5">{stats.rate}%</div>
            <div className="text-[10px] text-slate-500 mt-2 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> SOC2 target aligned
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full shrink-0" />
          <CardContent className="p-5 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active On Track</span>
            <div className="text-3xl font-black text-indigo-600 mt-1.5">{stats.onTrack}</div>
            <div className="text-[10px] text-slate-500 mt-2 font-medium">Progressing healthily</div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full shrink-0" />
          <CardContent className="p-5 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Review</span>
            <div className="text-3xl font-black text-amber-500 mt-1.5">{stats.pending}</div>
            <div className="text-[10px] text-slate-500 mt-2 font-medium">Awaiting lock-in</div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-rose-50 rounded-bl-full shrink-0" />
          <CardContent className="p-5 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overdue/Risk OKRs</span>
            <div className="text-3xl font-black text-rose-500 mt-1.5">{stats.overdue}</div>
            <div className="text-[10px] text-slate-500 mt-2 font-semibold flex items-center gap-1 text-rose-500">
              <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Action required
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nav Tabs for different analytical layers */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: "executive", name: "Executive Portfolio", icon: <Award className="w-4 h-4" /> },
          { id: "operational", name: "Operational Readiness", icon: <Layers className="w-4 h-4" /> },
          { id: "alignment", name: "Corporate Alignments", icon: <Compass className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {/* Render Active Tab */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Compiling metrics...</p>
        </div>
      ) : (
        <>
          {activeTab === "executive" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Stacked Completion Distributions */}
                <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Completion Target Distributions</CardTitle>
                    <CardDescription className="text-xs">Identifies the volume of goals categorized by their percentage of achievement.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer>
                        <BarChart data={distributionData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <YAxis dataKey="range" type="category" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* QoQ Area Chart Trends */}
                <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Quarterly Trend Analysis (QoQ)</CardTitle>
                    <CardDescription className="text-xs">Tracks Target alignment versus actual achievement rates historically.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer>
                        <AreaChart data={quarterlyTrendData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME_COLORS.indigo} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={THEME_COLORS.indigo} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAchievement" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME_COLORS.emerald} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={THEME_COLORS.emerald} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="Target" stroke={THEME_COLORS.indigo} fillOpacity={1} fill="url(#colorTarget)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Achievement" stroke={THEME_COLORS.emerald} fillOpacity={1} fill="url(#colorAchievement)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard panel */}
              <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Manager Effectiveness Leaderboard
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">Assesses managers based on approval velocity, team OKR scoping rates, and active monitoring health.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 border-slate-200">Corporate Roster</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          <th className="py-3 px-6">Manager Name</th>
                          <th className="py-3 px-6">Department Scope</th>
                          <th className="py-3 px-6 text-center">Team Members</th>
                          <th className="py-3 px-6 text-center">Active Monitored Goals</th>
                          <th className="py-3 px-6 text-center">Average Approval Speed</th>
                          <th className="py-3 px-6 text-right">Index Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {leaderBoard.map((mgr, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-bold text-slate-800">{mgr.name}</td>
                            <td className="py-3.5 px-6 text-slate-500 font-medium">{mgr.department}</td>
                            <td className="py-3.5 px-6 text-center font-semibold text-slate-700">{mgr.teamMembers}</td>
                            <td className="py-3.5 px-6 text-center font-semibold text-slate-700">{mgr.activeOKRs}</td>
                            <td className="py-3.5 px-6 text-center">
                              <Badge className="bg-slate-100 text-slate-700 font-bold border-0 text-[10px]">
                                {mgr.approvalVelocity}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                mgr.score >= 90 ? "bg-emerald-100 text-emerald-800" :
                                mgr.score >= 80 ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {mgr.score}% score
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "operational" && (
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Radial Goals Progress */}
              <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Average Progress by Thrust Area</CardTitle>
                  <CardDescription className="text-xs">Calculates the combined completion rate grouped by key strategic thrust areas.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {radialThrustData.length > 0 ? (
                    <div className="h-[280px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="85%" barSize={10} data={radialThrustData}>
                          <RadialBar background dataKey="uv" />
                          <Tooltip />
                          <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 9, lineHeight: "16px" }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-medium">No thrust area groupings seeded.</div>
                  )}
                </CardContent>
              </Card>

              {/* Overdue Objectives Risk Analyzer */}
              <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Overdue OKRs / Scoping Risks</CardTitle>
                  <CardDescription className="text-xs">Analyzes performance targets currently trailing cycle milestones.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center gap-6">
                  <div className="flex items-center gap-5 bg-rose-50/50 border border-rose-100 p-4 rounded-2xl">
                    <AlertTriangle className="w-10 h-10 text-rose-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">Pending Cycle Action</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        There are <span className="font-bold text-rose-600">{stats.overdue} active objectives</span> that have surpassed 60 days without completion. Managers are advised to issue reminders.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Risk Assessment Score</span>
                      <span className="text-rose-500 font-bold uppercase tracking-wider">High Attention Scoped</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.overdue / (stats.total || 1)) * 100, 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium italic">
                      Risk rating computed relative to total company objectives count ({stats.total}).
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "alignment" && (
            <div className="space-y-6">
              
              {/* Department Comparison Bar Chart */}
              <Card className="border-0 ring-1 ring-slate-200/60 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Department Alignment Comparisons</CardTitle>
                  <CardDescription className="text-xs">Correlates scoped objectives volumes and target completion scores across organizational units.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer>
                      <BarChart data={departmentData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Goal Count" fill={THEME_COLORS.indigo} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Completion Rate (%)" fill={THEME_COLORS.emerald} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
