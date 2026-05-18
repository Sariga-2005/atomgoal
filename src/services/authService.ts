import { User } from "@/types";
import { db, runWithRetry } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, getDoc, query, where } from "firebase/firestore";

const INITIAL_USERS: User[] = [
  { id: "emp1", name: "Priya Sharma",  email: "employee@demo.com", role: "employee", managerId: "mgr1",   department: "Engineering" },
  { id: "emp2", name: "Ravi Kumar",    email: "ravi@atomgoal.com",  role: "employee", managerId: "mgr1",   department: "Engineering" },
  { id: "emp3", name: "Sneha Patel",   email: "sneha@atomgoal.com", role: "employee", managerId: "mgr1",   department: "Engineering" },
  { id: "mgr1", name: "Arun Mehta",   email: "manager@demo.com",   role: "manager",  managerId: "admin1", department: "Engineering" },
  { id: "admin1", name: "Kavitha Nair", email: "admin@demo.com",  role: "admin",                          department: "HR" },
];

export const authService = {
  async getUsers(): Promise<User[]> {
    const snap = await runWithRetry(() => getDocs(collection(db, "users")));
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as User);
    }
    // Seed the demo users into Firestore on first run
    console.log("Seeding initial users into Firestore...");
    for (const u of INITIAL_USERS) {
      await runWithRetry(() => setDoc(doc(db, "users", u.id), u));
    }
    return INITIAL_USERS;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
    const snap = await runWithRetry(() => getDocs(q));
    if (!snap.empty) return snap.docs[0].data() as User;
    return undefined;
  },

  async getUser(id: string): Promise<User | undefined> {
    if (!id) return undefined;
    const snap = await runWithRetry(() => getDoc(doc(db, "users", id)));
    if (snap.exists()) return snap.data() as User;
    // Fallback: search by iterating users
    const all = await this.getUsers();
    return all.find(u => u.id === id);
  },

  async saveUser(user: User): Promise<void> {
    if (!user?.id || !user?.email) throw new Error("Invalid user profile payload");
    await runWithRetry(() => setDoc(doc(db, "users", user.id), user));
    console.log(`Saved user ${user.email} to Firestore`);
  }
};
