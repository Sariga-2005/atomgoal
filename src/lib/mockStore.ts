import { Goal, User, QuarterlyCheckin, SharedGoal, AuditLog } from "@/types";

export const INITIAL_USERS: User[] = [
  { id: "emp1", name: "Priya Sharma", email: "priya@atomgoal.com", role: "employee", managerId: "mgr1", department: "Engineering" },
  { id: "emp2", name: "Ravi Kumar", email: "ravi@atomgoal.com", role: "employee", managerId: "mgr1", department: "Engineering" },
  { id: "emp3", name: "Sneha Patel", email: "sneha@atomgoal.com", role: "employee", managerId: "mgr1", department: "Engineering" },
  { id: "mgr1", name: "Arun Mehta", email: "arun@atomgoal.com", role: "manager", managerId: "admin1", department: "Engineering" },
  { id: "admin1", name: "Kavitha Nair", email: "kavitha@atomgoal.com", role: "admin", department: "HR" },
];

const INITIAL_GOALS: Goal[] = [
  {
    id: "goal1",
    userId: "emp1",
    managerId: "mgr1",
    thrustArea: "Infrastructure Stability",
    title: "Scale Core Microservices Architecture",
    description: "Refactor core Monolithic API endpoints into self-healing gRPC microservices and optimize Kubernetes pod auto-scaling policies.",
    unit: "%",
    target: "100",
    weightage: 35,
    status: "Approved",
    isShared: false,
    locked: true,
    achievement: "85",
    progressStatus: "On Track",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    managerComments: "Priya is doing fantastic work migrating the auth services. Keep it up!"
  },
  {
    id: "goal2",
    userId: "emp1",
    managerId: "mgr1",
    thrustArea: "Product Roadmap",
    title: "Accelerate Q2 Enterprise OKR Portal Release",
    description: "Deliver high-fidelity Recharts visualization suites and granular Firebase RBAC capabilities ahead of schedule.",
    unit: "%",
    target: "100",
    weightage: 25,
    status: "Pending Approval",
    isShared: false,
    locked: false,
    achievement: "40",
    progressStatus: "On Track",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "goal3",
    userId: "emp2",
    managerId: "mgr1",
    thrustArea: "System Performance",
    title: "Optimize Database Indexing & Query Latency",
    description: "Identify slow-running PostgreSQL queries using pg_stat_statements and implement partition tables to reduce read latency by 40%.",
    unit: "Numeric",
    target: "200", // milliseconds average response time
    weightage: 40,
    status: "Approved",
    isShared: true,
    locked: true,
    achievement: "280", // currently at 280ms (heading down to 200ms)
    progressStatus: "Not Started",
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    managerComments: "Ensure index usage is properly verified in the staging environment before production deployment."
  },
  {
    id: "goal4",
    userId: "emp3",
    managerId: "mgr1",
    thrustArea: "Security Governance",
    title: "Implement Next-Gen Multi-Tenant RBAC Framework",
    description: "Establish automated security context verification and end-to-end token auditing protocols across all customer workspaces.",
    unit: "%",
    target: "100",
    weightage: 50,
    status: "Approved",
    isShared: false,
    locked: true,
    achievement: "100",
    progressStatus: "Completed",
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    managerComments: "Amazing work completing this ahead of the audit compliance schedule. Brilliant execution!"
  },
  {
    id: "goal5",
    userId: "mgr1",
    managerId: "admin1",
    thrustArea: "Team Operations",
    title: "Increase Team Agile Velocity by 20%",
    description: "Streamline sprint planning backlogs, reduce technical debt cycles, and train team members on modular React design systems.",
    unit: "%",
    target: "20",
    weightage: 40,
    status: "Approved",
    isShared: false,
    locked: true,
    achievement: "15",
    progressStatus: "On Track",
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "goal6",
    userId: "emp1",
    managerId: "mgr1",
    thrustArea: "Security Governance",
    title: "Review and Fix Q2 Security Vulnerabilities",
    description: "Remediate high-severity Snyk scans and address dependency updates across modern repositories.",
    unit: "%",
    target: "100",
    weightage: 20,
    status: "Rejected",
    isShared: false,
    locked: false,
    achievement: "0",
    progressStatus: "Not Started",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    managerComments: "Please revise this goal sheet to combine vulnerability remediation with the Monolithic scale goal."
  }
];

const INITIAL_CHECKINS: QuarterlyCheckin[] = [
  {
    id: "check1",
    goalId: "goal1",
    userId: "emp1",
    quarter: "Q2",
    year: 2026,
    achievement: "85",
    progressStatus: "On Track",
    employeeComments: "Monolith database decoupling is done. All auth routes have successfully been moved to gRPC microservices and show 99.99% uptime.",
    managerComments: "Stunning execution. Let's make sure the remaining user management endpoints are migrated before end of Q2.",
    status: "Approved",
    submittedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    reviewedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "check2",
    goalId: "goal4",
    userId: "emp3",
    quarter: "Q2",
    year: 2026,
    achievement: "100",
    progressStatus: "Completed",
    employeeComments: "All RBAC policies are fully implemented, and tests prove 100% policy enforcement. Security audit successfully passed.",
    managerComments: "Fantastic milestone Sneha! This is a core requirement for our SOC2 compliance path.",
    status: "Approved",
    submittedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    reviewedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "check3",
    goalId: "goal2",
    userId: "emp1",
    quarter: "Q2",
    year: 2026,
    achievement: "75",
    progressStatus: "On Track",
    employeeComments: "Delivered initial Recharts layout wireframes and configured dynamic Firebase route guards. High-fidelity components ready for audit approval.",
    status: "Pending Review",
    submittedAt: Date.now() - 10 * 60 * 1000,
  }
];

const INITIAL_SHARED_GOALS: SharedGoal[] = [
  {
    id: "sg1",
    department: "Engineering",
    thrustArea: "Operational Excellence",
    title: "Maintain 99.95% Core Platform Availability",
    description: "Ensure active-active multi-region deployment checks and run weekly chaos engineering experiments on our database clusters.",
    unit: "%",
    target: "99.95",
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000
  },
  {
    id: "sg2",
    department: "Engineering",
    thrustArea: "Security Governance",
    title: "100% SOC2 Compliance Readiness",
    description: "Establish automated continuous log auditing and restrict production SSH environments using short-lived credentials.",
    unit: "%",
    target: "100",
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log1",
    entityType: "goal",
    entityId: "goal1",
    changedBy: "mgr1",
    action: "Approved Goal Sheet",
    previousValue: "Pending Approval",
    updatedValue: "Approved",
    timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000
  },
  {
    id: "log2",
    entityType: "goal",
    entityId: "goal6",
    changedBy: "mgr1",
    action: "Rejected Goal",
    previousValue: "Pending Approval",
    updatedValue: "Rejected",
    timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000
  },
  {
    id: "log3",
    entityType: "checkin",
    entityId: "check1",
    changedBy: "mgr1",
    action: "Reviewed Q2 Check-in",
    previousValue: "Submitted",
    updatedValue: "Reviewed",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
  }
];

function uid() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

class MockStore {
  private save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  private load<T>(key: string, fallback: T): T {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  }

  // ─── Users ───
  getUsers(): User[] {
    const data = this.load<User[] | null>("ag_users", null);
    if (!data) { 
      this.save("ag_users", INITIAL_USERS); 
      return INITIAL_USERS; 
    }
    return data;
  }

  saveUser(user: User) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.id === user.id);
    if (i >= 0) users[i] = user; else users.push(user);
    this.save("ag_users", users);
  }

  // ─── Goals ───
  getGoals(userId?: string): Goal[] {
    const goals = this.load<Goal[] | null>("ag_goals", null);
    if (!goals) {
      this.save("ag_goals", INITIAL_GOALS);
      return userId ? INITIAL_GOALS.filter(g => g.userId === userId) : INITIAL_GOALS;
    }
    return userId ? goals.filter(g => g.userId === userId) : goals;
  }

  getGoalsByManager(managerId: string): Goal[] {
    return this.getGoals().filter(g => g.managerId === managerId);
  }

  getGoalById(id: string): Goal | undefined {
    return this.getGoals().find(g => g.id === id);
  }

  saveGoal(goal: Goal) {
    const goals = this.getGoals();
    const i = goals.findIndex(g => g.id === goal.id);
    if (i >= 0) goals[i] = goal; else goals.push(goal);
    this.save("ag_goals", goals);
  }

  saveGoals(updated: Goal[]) {
    const all = this.getGoals();
    updated.forEach(g => {
      const i = all.findIndex(x => x.id === g.id);
      if (i >= 0) all[i] = g; else all.push(g);
    });
    this.save("ag_goals", all);
  }

  deleteGoal(id: string) {
    this.save("ag_goals", this.getGoals().filter(g => g.id !== id));
  }

  // ─── Check-ins ───
  getCheckins(goalId?: string): QuarterlyCheckin[] {
    const all = this.load<QuarterlyCheckin[] | null>("ag_checkins", null);
    if (!all) {
      this.save("ag_checkins", INITIAL_CHECKINS);
      return goalId ? INITIAL_CHECKINS.filter(c => c.goalId === goalId) : INITIAL_CHECKINS;
    }
    return goalId ? all.filter(c => c.goalId === goalId) : all;
  }

  getCheckinsByUser(userId: string): QuarterlyCheckin[] {
    return this.getCheckins().filter(c => c.userId === userId);
  }

  saveCheckin(checkin: QuarterlyCheckin) {
    const all = this.getCheckins();
    const i = all.findIndex(c => c.id === checkin.id);
    if (i >= 0) all[i] = checkin; else all.push(checkin);
    this.save("ag_checkins", all);
  }

  // ─── Shared Goals ───
  getSharedGoals(department?: string): SharedGoal[] {
    const all = this.load<SharedGoal[] | null>("ag_shared_goals", null);
    if (!all) {
      this.save("ag_shared_goals", INITIAL_SHARED_GOALS);
      return department ? INITIAL_SHARED_GOALS.filter(g => g.department === department) : INITIAL_SHARED_GOALS;
    }
    return department ? all.filter(g => g.department === department) : all;
  }

  saveSharedGoal(sg: SharedGoal) {
    const all = this.getSharedGoals();
    const i = all.findIndex(x => x.id === sg.id);
    if (i >= 0) all[i] = sg; else all.push(sg);
    this.save("ag_shared_goals", all);
  }

  // ─── Audit Logs ───
  addAuditLog(log: Omit<AuditLog, "id" | "timestamp">) {
    const logs = this.load<AuditLog[] | null>("ag_audit_logs", null);
    const activeLogs = logs || INITIAL_AUDIT_LOGS;
    const newLog = { ...log, id: uid(), timestamp: Date.now() };
    activeLogs.push(newLog);
    this.save("ag_audit_logs", activeLogs);
  }

  getAuditLogs(): AuditLog[] {
    const logs = this.load<AuditLog[] | null>("ag_audit_logs", null);
    if (!logs) {
      this.save("ag_audit_logs", INITIAL_AUDIT_LOGS);
      return INITIAL_AUDIT_LOGS;
    }
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ─── Helpers ───
  generateId(): string { return uid(); }

  resetAll() {
    ["ag_users","ag_goals","ag_checkins","ag_shared_goals","ag_audit_logs"].forEach(k => localStorage.removeItem(k));
  }
}

export const mockStore = new MockStore();
export { INITIAL_GOALS, INITIAL_CHECKINS, INITIAL_SHARED_GOALS, INITIAL_AUDIT_LOGS };
