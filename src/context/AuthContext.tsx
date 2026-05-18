import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Role } from "@/types";
import { authService } from "@/services";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import {
  auth, db, runWithRetry,
  subscribeToConnectionStatus, ConnectionStatus, setConnectionStatus
} from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  allUsers: User[];
  isLoading: boolean;
  signUp: (newUser: Omit<User, "id">, password?: string) => Promise<void>;
  connectionStatus: ConnectionStatus;
  forceOfflineFallback: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo email → profile mappings for auto-registration
const DEMO_PROFILES: Record<string, Partial<User>> = {
  "employee@demo.com": { id: "emp1", name: "Priya Sharma",  role: "employee", department: "Engineering", managerId: "mgr1"   },
  "manager@demo.com":  { id: "mgr1", name: "Arun Mehta",   role: "manager",  department: "Engineering", managerId: "admin1" },
  "admin@demo.com":    { id: "admin1", name: "Kavitha Nair", role: "admin",   department: "HR"           },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setLocalConnectionStatus] = useState<ConnectionStatus>("demo");

  useEffect(() => {
    return subscribeToConnectionStatus(setLocalConnectionStatus);
  }, []);

  const forceOfflineFallback = useCallback(() => setConnectionStatus("offline"), []);

  const reloadUsers = useCallback(async () => {
    try {
      const users = await authService.getUsers();
      setAllUsers(users);
      return users;
    } catch (err) {
      console.error("Failed to load users from Firestore:", err);
      return [];
    }
  }, []);

  // ── Firebase Auth listener ────────────────────────────────────────────────
  useEffect(() => {
    let unsubAuth: (() => void) | undefined;

    const init = async () => {
      setIsLoading(true);

      // Pre-load user list (seeds Firestore if empty)
      await reloadUsers();

      unsubAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const email = fbUser.email?.toLowerCase().trim() || "";
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await runWithRetry(() => getDocs(q));

            if (!snap.empty) {
              const profile = snap.docs[0].data() as User;
              setUser(profile);
              setConnectionStatus("connected");
            } else {
              // Profile missing — create it (handles fresh Firebase projects)
              const demo = DEMO_PROFILES[email];
              const newUser: User = {
                id: demo?.id || `user_${Math.random().toString(36).substring(2, 9)}`,
                name: demo?.name || email.split("@")[0],
                email,
                role: (demo?.role as Role) || "employee",
                department: demo?.department || "Engineering",
              };
              if (demo?.managerId) {
                newUser.managerId = demo.managerId;
              }
              await runWithRetry(() => setDoc(doc(db, "users", newUser.id), newUser));
              setUser(newUser);
              setConnectionStatus("connected");
              await reloadUsers();
            }
          } catch (err) {
            console.error("Failed to load profile from Firestore:", err);
            setConnectionStatus("offline");
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
    };

    init();
    return () => { if (unsubAuth) unsubAuth(); };
  }, [reloadUsers]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password = "Demo123") => {
    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      // onAuthStateChanged handles the rest
    } catch (err: any) {
      // Auto-register demo accounts on first use
      if (["auth/user-not-found", "auth/invalid-credential", "auth/invalid-email"].includes(err.code)) {
        try {
          console.log(`Auto-registering ${cleanEmail}...`);
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
          // onAuthStateChanged will fire and create the Firestore profile
          return;
        } catch (regErr: any) {
          setIsLoading(false);
          throw new Error(regErr.message || "Registration failed");
        }
      }
      setIsLoading(false);
      throw new Error(err.message || "Login failed");
    }
  }, []);

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const signUp = useCallback(async (newProfile: Omit<User, "id">, password = "Demo123") => {
    setIsLoading(true);
    const cleanEmail = newProfile.email.toLowerCase().trim();
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const newUser: User = { ...newProfile, id: cred.user.uid, email: cleanEmail };
      if (newUser.managerId === undefined) {
        delete newUser.managerId;
      }
      await runWithRetry(() => setDoc(doc(db, "users", newUser.id), newUser));
      setConnectionStatus("connected");
      await reloadUsers();
    } catch (err: any) {
      setIsLoading(false);
      throw new Error(err.message || "Sign-up failed");
    }
  }, [reloadUsers]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, allUsers, isLoading, signUp, connectionStatus, forceOfflineFallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
