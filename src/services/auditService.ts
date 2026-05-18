import { AuditLog } from "@/types";
import { db, runWithRetry } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log1", entityType: "goal", entityId: "goal1", changedBy: "mgr1",
    action: "APPROVE_GOAL",
    previousValue: { status: "Pending Approval" },
    updatedValue: { status: "Approved", locked: true },
    timestamp: Date.now() - 15 * 86400000
  },
  {
    id: "log2", entityType: "goal", entityId: "goal6", changedBy: "mgr1",
    action: "REJECT_GOAL",
    previousValue: { status: "Pending Approval" },
    updatedValue: { status: "Rejected", managerComments: "Please revise and combine with scale goal." },
    timestamp: Date.now() - 8 * 86400000
  },
  {
    id: "log3", entityType: "checkin", entityId: "check1", changedBy: "mgr1",
    action: "APPROVE_CHECKIN",
    previousValue: { status: "Pending Review" },
    updatedValue: { status: "Approved" },
    timestamp: Date.now() - 2 * 86400000
  }
];

export const auditService = {
  async addAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
    const logId = `log_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
    const fullLog: AuditLog = { ...log, id: logId, timestamp: Date.now() };
    await runWithRetry(() => setDoc(doc(db, "audit_logs", logId), fullLog));
    console.log(`Audit log written: ${log.action}`);
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await runWithRetry(() => getDocs(collection(db, "audit_logs")));

    if (snap.empty) {
      console.log("Seeding initial audit logs into Firestore...");
      for (const log of SEED_AUDIT_LOGS) {
        await runWithRetry(() => setDoc(doc(db, "audit_logs", log.id), log));
      }
      return [...SEED_AUDIT_LOGS].sort((a, b) => b.timestamp - a.timestamp);
    }

    return snap.docs
      .map(d => d.data() as AuditLog)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
};
