"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

interface Alert {
  id: string;
  stationId: string;
  condition: string;
  value: number;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-red-50 text-red-600",
  RESOLVED: "bg-gray-100 text-gray-500",
  ACKNOWLEDGED: "bg-blue-50 text-blue-600",
};

function formatDate(raw: string | undefined) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString();
  } catch {
    return raw;
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let db;
    try {
      db = getFirestore(app);
    } catch {
      setError("Firebase not configured. Check your .env.local file.");
      setLoading(false);
      return;
    }

    // Order by createdAt desc, cap at 20 documents to limit Firestore read tokens
    const q = query(
      collection(db, "alerts"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data() as Alert);
        setAlerts(data);
        setLoading(false);
      },
      (err) => {
        setError("Failed to load alerts: " + err.message);
        setLoading(false);
      }
    );

    // Unsubscribe when component unmounts — stops Firestore reads
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Alert History
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          Showing the 20 most recent alerts across all stations. Updates in real time.
        </p>

        {loading && (
          <p className="text-zinc-500 text-sm">Loading alerts...</p>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <p className="text-zinc-500 text-sm">
            No alerts yet. Alerts appear here when a sensor threshold is exceeded.
          </p>
        )}

        {!loading && !error && alerts.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Station</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Condition</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Value</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Severity</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Message</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, i) => (
                  <tr
                    key={alert.id ?? i}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {alert.stationId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {alert.condition ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                      {alert.value != null ? alert.value.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          SEVERITY_STYLES[alert.severity] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {alert.severity ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[alert.status] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {alert.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                      {alert.message ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(alert.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
