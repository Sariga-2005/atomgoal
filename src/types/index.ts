export type Role = "employee" | "manager" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string; // Null for admin or top level manager
  department: string;
}

export type UnitOfMeasurement = "Numeric" | "%" | "Timeline" | "Zero-based";
export type GoalStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected";
export type ProgressStatus = "Not Started" | "On Track" | "Completed";

export interface Goal {
  id: string;
  userId: string;
  managerId: string;
  thrustArea: string;
  title: string;
  description: string;
  unit: UnitOfMeasurement;
  target: string;
  weightage: number; // Percentage 10-100
  status: GoalStatus;
  isShared: boolean;
  locked: boolean;
  achievement: string; // The current achieved value
  progressStatus: ProgressStatus;
  managerComments?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuarterlyCheckin {
  id: string;
  goalId: string;
  userId: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  achievement: string;
  progressStatus: ProgressStatus;
  employeeComments: string;
  managerComments?: string;
  status?: "Draft" | "Pending Review" | "Approved" | "Revision Requested";
  submittedAt: number;
  reviewedAt?: number;
}

export interface SharedGoal {
  id: string;
  department: string;
  thrustArea: string;
  title: string;
  description: string;
  unit: UnitOfMeasurement;
  target: string;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  entityType: "goal" | "checkin" | "user";
  entityId: string;
  changedBy: string; // userId
  action: string;
  previousValue: any;
  updatedValue: any;
  timestamp: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}
