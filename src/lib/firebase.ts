import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123:web:123",
};

// Initialize Firebase safely
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);

// Use configuration switch
export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === "true";

export function withTimeout<T>(promise: Promise<T>, ms = 7500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Firebase connection timeout")), ms)
    )
  ]);
}

// Connection Health Status Tracker
export type ConnectionStatus = "connected" | "demo" | "offline";

// Starts as "demo" — transitions to "connected" after the first successful
// Firestore round-trip, or "offline" if all retries fail.
let connectionStatus: ConnectionStatus = USE_FIREBASE ? "offline" : "demo";
const listeners: ((status: ConnectionStatus) => void)[] = [];

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function setConnectionStatus(status: ConnectionStatus) {
  if (connectionStatus !== status) {
    connectionStatus = status;
    listeners.forEach(cb => cb(status));
  }
}

export function subscribeToConnectionStatus(cb: (status: ConnectionStatus) => void) {
  listeners.push(cb);
  cb(connectionStatus);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Executes a Firestore/Firebase promise-returning function with timeout and exponential backoff retry.
 * Automatically switches connection status to 'offline' if connection fails.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelay = 1000
): Promise<T> {
  if (!USE_FIREBASE) {
    throw new Error("Firebase is disabled in Demo Mode");
  }

  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await withTimeout(fn(), 7500);
      // Success! Upgrade back to connected
      setConnectionStatus("connected");
      return result;
    } catch (err: any) {
      lastErr = err;
      console.warn(`Firebase attempt ${i + 1} of ${retries} failed. Retrying...`, err);
      
      // Don't wait on the last attempt
      if (i < retries - 1) {
        const delay = initialDelay * Math.pow(1.5, i); // Mild exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we reach here, all retries failed. Downgrade status to offline.
  setConnectionStatus("offline");
  throw lastErr;
}
