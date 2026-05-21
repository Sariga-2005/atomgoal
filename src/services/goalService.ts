import { Goal, QuarterlyCheckin, SharedGoal } from "@/types";
import { isWithinQuarter } from "@/lib/temporal";
import { db, runWithRetry } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, query, where, writeBatch, deleteDoc } from "firebase/firestore";

// ─── Seed data (written to Firestore on first run only) ───────────────────────
const SEED_GOALS: Goal[] = [
  {
    id: "goal1", userId: "emp1", managerId: "mgr1",
    thrustArea: "Infrastructure Stability",
    title: "Scale Core Microservices Architecture",
    description: "Refactor monolithic API endpoints into self-healing gRPC microservices and optimize Kubernetes pod auto-scaling.",
    unit: "%", target: "100", weightage: 35,
    status: "Approved", isShared: false, locked: true,
    achievement: "85", progressStatus: "On Track",
    createdAt: Date.now() - 30 * 86400000, updatedAt: Date.now() - 2 * 86400000,
    managerComments: "Fantastic progress migrating the auth services. Keep it up!"
  },
  {
    id: "goal2", userId: "emp1", managerId: "mgr1",
    thrustArea: "Product Roadmap",
    title: "Accelerate Q2 Enterprise OKR Portal Release",
    description: "Deliver high-fidelity Recharts visualizations and granular Firebase RBAC capabilities ahead of schedule.",
    unit: "%", target: "100", weightage: 25,
    status: "Pending Approval", isShared: false, locked: false,
    achievement: "40", progressStatus: "On Track",
    createdAt: Date.now() - 15 * 86400000, updatedAt: Date.now() - 86400000,
  },
  {
    id: "goal3", userId: "emp2", managerId: "mgr1",
    thrustArea: "System Performance",
    title: "Optimize Database Indexing & Query Latency",
    description: "Identify slow PostgreSQL queries and implement partition tables to reduce read latency by 40%.",
    unit: "Numeric", target: "200", weightage: 40,
    status: "Approved", isShared: true, locked: true,
    achievement: "280", progressStatus: "Not Started",
    createdAt: Date.now() - 20 * 86400000, updatedAt: Date.now() - 10 * 86400000,
    managerComments: "Verify index usage in staging before production deployment."
  },
  {
    id: "goal4", userId: "emp3", managerId: "mgr1",
    thrustArea: "Security Governance",
    title: "Implement Next-Gen Multi-Tenant RBAC Framework",
    description: "Establish automated security context verification and end-to-end token auditing protocols.",
    unit: "%", target: "100", weightage: 50,
    status: "Approved", isShared: false, locked: true,
    achievement: "100", progressStatus: "Completed",
    createdAt: Date.now() - 45 * 86400000, updatedAt: Date.now() - 5 * 86400000,
    managerComments: "Amazing work completing this ahead of the audit compliance schedule!"
  },
  {
    id: "goal5", userId: "mgr1", managerId: "admin1",
    thrustArea: "Team Operations",
    title: "Increase Team Agile Velocity by 20%",
    description: "Streamline sprint planning, reduce technical debt, and train team on modular React design systems.",
    unit: "%", target: "20", weightage: 40,
    status: "Approved", isShared: false, locked: true,
    achievement: "15", progressStatus: "On Track",
    createdAt: Date.now() - 35 * 86400000, updatedAt: Date.now() - 3 * 86400000,
  },
  {
    id: "goal6", userId: "emp1", managerId: "mgr1",
    thrustArea: "Security Governance",
    title: "Review and Fix Q2 Security Vulnerabilities",
    description: "Remediate high-severity Snyk scans and address dependency updates across repositories.",
    unit: "%", target: "100", weightage: 20,
    status: "Rejected", isShared: false, locked: false,
    achievement: "0", progressStatus: "Not Started",
    createdAt: Date.now() - 10 * 86400000, updatedAt: Date.now() - 8 * 86400000,
    managerComments: "Please revise and combine with the Monolithic scale goal."
  }
];

const SEED_CHECKINS: QuarterlyCheckin[] = [
  {
    id: "check1", goalId: "goal1", userId: "emp1", quarter: "Q2", year: 2026,
    achievement: "85", progressStatus: "On Track",
    employeeComments: "Auth routes migrated to gRPC microservices, showing 99.99% uptime.",
    managerComments: "Stunning execution! Migrate remaining user management endpoints before Q2 end.",
    status: "Approved",
    submittedAt: Date.now() - 3 * 86400000, reviewedAt: Date.now() - 2 * 86400000,
  },
  {
    id: "check2", goalId: "goal4", userId: "emp3", quarter: "Q2", year: 2026,
    achievement: "100", progressStatus: "Completed",
    employeeComments: "All RBAC policies implemented. Security audit passed.",
    managerComments: "Fantastic milestone — core for our SOC2 compliance path.",
    status: "Approved",
    submittedAt: Date.now() - 6 * 86400000, reviewedAt: Date.now() - 5 * 86400000,
  },
  {
    id: "check3", goalId: "goal2", userId: "emp1", quarter: "Q2", year: 2026,
    achievement: "75", progressStatus: "On Track",
    employeeComments: "Recharts layout wireframes delivered, Firebase route guards configured.",
    status: "Pending Review",
    submittedAt: Date.now() - 10 * 60000,
  }
];

const SEED_SHARED_GOALS: SharedGoal[] = [
  {
    id: "sg1", department: "Engineering", thrustArea: "Operational Excellence",
    title: "Maintain 99.95% Core Platform Availability",
    description: "Active-active multi-region deployment checks and weekly chaos engineering experiments.",
    unit: "%", target: "99.95",
    createdAt: Date.now() - 40 * 86400000
  },
  {
    id: "sg2", department: "Engineering", thrustArea: "Security Governance",
    title: "100% SOC2 Compliance Readiness",
    description: "Automated continuous log auditing and restricted production SSH with short-lived credentials.",
    unit: "%", target: "100",
    createdAt: Date.now() - 40 * 86400000
  }
];

// ─── Service ──────────────────────────────────────────────────────────────────
export const goalService = {

  async getGoals(userId?: string): Promise<Goal[]> {
    let q = collection(db, "goals") as any;
    if (userId) {
      q = query(collection(db, "goals"), where("userId", "==", userId));
    }
    const snap = await runWithRetry(() => getDocs(q));
    let goals: Goal[] = [];

    if (snap.empty && !userId) {
      console.log("Seeding initial goals into Firestore...");
      const batch = writeBatch(db);
      SEED_GOALS.forEach(g => batch.set(doc(db, "goals", g.id), g));
      await runWithRetry(() => batch.commit());
      goals = SEED_GOALS;
    } else {
      goals = snap.docs.map(d => d.data() as Goal);
    }

    return goals;
  },

  async getGoalsByManager(managerId: string): Promise<Goal[]> {
    if (!managerId) return [];
    const q = query(collection(db, "goals"), where("managerId", "==", managerId));
    const snap = await runWithRetry(() => getDocs(q));
    if (!snap.empty) return snap.docs.map(d => d.data() as Goal);
    // If empty, trigger full seeding then filter
    const all = await this.getGoals();
    return all.filter(g => g.managerId === managerId);
  },

  async saveGoal(goal: Goal): Promise<void> {
    if (!goal?.id || !goal?.userId || !goal?.title) {
      throw new Error("Invalid Goal: missing required fields (id, userId, title)");
    }
    goal.updatedAt = Date.now();
    await runWithRetry(() => setDoc(doc(db, "goals", goal.id), goal));
  },

  async saveGoals(goals: Goal[]): Promise<void> {
    if (!goals?.length) return;
    const batch = writeBatch(db);
    goals.forEach(g => {
      g.updatedAt = Date.now();
      batch.set(doc(db, "goals", g.id), g);
    });
    await runWithRetry(() => batch.commit());
  },

  async deleteGoal(goalId: string): Promise<void> {
    if (!goalId) return;
    await runWithRetry(() => deleteDoc(doc(db, "goals", goalId)));
  },

  async getCheckins(goalId?: string): Promise<QuarterlyCheckin[]> {
    let q = collection(db, "checkins") as any;
    if (goalId) {
      q = query(collection(db, "checkins"), where("goalId", "==", goalId));
    }
    const snap = await runWithRetry(() => getDocs(q));
    let checkins: QuarterlyCheckin[] = [];

    if (snap.empty && !goalId) {
      console.log("Seeding initial check-ins into Firestore...");
      const batch = writeBatch(db);
      SEED_CHECKINS.forEach(c => batch.set(doc(db, "checkins", c.id), c));
      await runWithRetry(() => batch.commit());
      checkins = SEED_CHECKINS;
    } else {
      checkins = snap.docs.map(d => d.data() as QuarterlyCheckin);
    }

    return checkins;
  },

  async saveCheckin(checkin: QuarterlyCheckin): Promise<void> {
    if (!checkin?.id || !checkin?.goalId || !checkin?.userId) {
      throw new Error("Invalid QuarterlyCheckin: missing required fields");
    }
    // Enforce temporal window based on user's locale
    const now = new Date();
    if (!isWithinQuarter(now)) {
      throw new Error("Check‑in submissions are only allowed during the active quarterly window.");
    }
    await runWithRetry(() => setDoc(doc(db, "checkins", checkin.id), checkin));
  },

  async getSharedGoals(department?: string): Promise<SharedGoal[]> {
    const snap = await runWithRetry(() => getDocs(collection(db, "shared_goals")));
    let shared: SharedGoal[] = [];

    if (snap.empty) {
      console.log("Seeding initial shared goals into Firestore...");
      const batch = writeBatch(db);
      SEED_SHARED_GOALS.forEach(sg => batch.set(doc(db, "shared_goals", sg.id), sg));
      await runWithRetry(() => batch.commit());
      shared = SEED_SHARED_GOALS;
    } else {
      shared = snap.docs.map(d => d.data() as SharedGoal);
    }

    return department ? shared.filter(g => g.department === department) : shared;
  },

  async saveSharedGoal(sg: SharedGoal): Promise<void> {
    if (!sg?.id || !sg?.department || !sg?.title) {
      throw new Error("Invalid SharedGoal: missing required fields");
    }
    await runWithRetry(() => setDoc(doc(db, "shared_goals", sg.id), sg));
  }
};
