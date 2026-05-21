import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Goal, QuarterlyCheckin, User } from "@/types";
import { computeProgressScore } from "@/lib/progress";
import { useAuth } from "@/context/AuthContext";

export interface AnalyticsData {
  qoqTrend: { name: string; Target: number; Achievement: number; efficiency: number }[];
  deptCompletion: { department: string; completed: number; total: number; rate: number }[];
  thrustAreaDist: { name: string; value: number }[];
  managerEffectiveness: { quarter: string; completionRate: number }[];
  totalGoals: number;
  approvedGoals: number;
  avgScore: number;
  completedGoals: number;
  isLoading: boolean;
  error: string | null;
}

export function useAnalyticsData(): AnalyticsData {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<QuarterlyCheckin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch Goals
        let goalsQuery = collection(db, "goals") as any;
        if (user.role !== "admin") {
          goalsQuery = query(collection(db, "goals"), where("managerId", "==", user.id));
        }
        const goalsSnap = await getDocs(goalsQuery);
        const fetchedGoals = goalsSnap.docs.map(doc => doc.data() as Goal);
        setGoals(fetchedGoals);

        // Fetch Checkins
        const checkinsSnap = await getDocs(collection(db, "checkins"));
        // Filter checkins client-side to only those matching our fetched goals
        const goalIds = new Set(fetchedGoals.map(g => g.id));
        const fetchedCheckins = checkinsSnap.docs
          .map(doc => doc.data() as QuarterlyCheckin)
          .filter(c => goalIds.has(c.goalId));
        setCheckins(fetchedCheckins);

        // Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        setUsers(usersSnap.docs.map(doc => doc.data() as User));
        
      } catch (err: any) {
        console.error("Error fetching analytics data:", err);
        setError(err.message || "Failed to fetch analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const analyticsData = useMemo(() => {
    if (goals.length === 0) {
      return {
        qoqTrend: [
          { name: "Q1", Target: 100, Achievement: 0, efficiency: 0 },
          { name: "Q2", Target: 100, Achievement: 0, efficiency: 0 },
          { name: "Q3", Target: 100, Achievement: 0, efficiency: 0 },
          { name: "Q4", Target: 100, Achievement: 0, efficiency: 0 },
        ],
        deptCompletion: [],
        thrustAreaDist: [],
        managerEffectiveness: [],
        totalGoals: 0,
        approvedGoals: 0,
        avgScore: 0,
        completedGoals: 0,
      };
    }

    // --- 1. Summary Stats ---
    const totalGoals = goals.length;
    const approvedGoals = goals.filter(g => g.status === "Approved").length;
    const completedGoals = goals.filter(g => g.progressStatus === "Completed").length;

    let totalScore = 0;
    goals.forEach(g => {
      const score = computeProgressScore(g.unit, g.achievement, g.target, { direction: g.scoringDirection });
      totalScore += score;
    });
    const avgScore = totalGoals > 0 ? Math.round(totalScore / totalGoals) : 0;

    // --- 2. QoQ Trend ---
    const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
    const qoqTrend = quarters.map(q => {
      const qCheckins = checkins.filter(c => c.quarter === q);
      let sumAchievement = 0;
      let count = 0;

      qCheckins.forEach(c => {
        const goal = goals.find(g => g.id === c.goalId);
        if (goal) {
          const score = computeProgressScore(goal.unit, c.achievement, goal.target, { direction: goal.scoringDirection });
          sumAchievement += score;
          count++;
        }
      });

      const avgAchievement = count > 0 ? Math.round(sumAchievement / count) : 0;
      // We use 100 as the normalized target for percentage-based scores
      const target = 100;
      const efficiency = target > 0 ? Math.min(100, Math.round((avgAchievement / target) * 100)) : 0;

      return {
        name: q,
        Target: target,
        Achievement: avgAchievement,
        efficiency
      };
    });

    // --- 3. Department Completion ---
    const deptMap: Record<string, { completed: number; total: number }> = {};
    goals.forEach(g => {
      const u = users.find(user => user.id === g.userId);
      const dept = u?.department || "Unknown";
      if (!deptMap[dept]) deptMap[dept] = { completed: 0, total: 0 };
      deptMap[dept].total++;
      if (g.progressStatus === "Completed") deptMap[dept].completed++;
    });

    const deptCompletion = Object.entries(deptMap).map(([department, data]) => ({
      department,
      completed: data.completed,
      total: data.total,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    // --- 4. Thrust Area Dist ---
    const thrustMap: Record<string, number> = {};
    goals.forEach(g => {
      thrustMap[g.thrustArea] = (thrustMap[g.thrustArea] || 0) + 1;
    });
    const thrustAreaDist = Object.entries(thrustMap).map(([name, value]) => ({ name, value }));

    // --- 5. Manager Effectiveness ---
    // % of goals that have a check-in for the given quarter
    const managerEffectiveness = quarters.map(q => {
      const checkinCount = checkins.filter(c => c.quarter === q).length;
      const rate = totalGoals > 0 ? Math.round((checkinCount / totalGoals) * 100) : 0;
      return {
        quarter: q,
        completionRate: rate
      };
    });

    return {
      qoqTrend,
      deptCompletion,
      thrustAreaDist,
      managerEffectiveness,
      totalGoals,
      approvedGoals,
      avgScore,
      completedGoals,
    };
  }, [goals, checkins, users]);

  return {
    ...analyticsData,
    isLoading,
    error
  };
}
