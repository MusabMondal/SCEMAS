"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface ThresholdRule {
  id: string;
  condition: string;
  operator: string;
  minThreshold: number;
  maxThreshold: number;
}

type AccountType = "PUBLIC_USER" | "CITY_OPERATOR" | "SYSTEM_ADMINISTRATOR";

const CONDITION_LABELS: Record<string, string> = {
  TEMPERATURE:   "Temperature (°C)",
  HUMIDITY:      "Humidity (%)",
  UV_INDEX:      "UV Index",
  WIND_SPEED:    "Wind Speed (km/h)",
  PRECIPITATION: "Precipitation (mm)",
  PRESSURE:      "Pressure (hPa)",
};

const OPERATOR_LABELS: Record<string, string> = {
  GT:      "Greater than (>)",
  LT:      "Less than (<)",
  BETWEEN: "Between",
};

export default function ThresholdsPage() {
  const [rules, setRules] = useState<ThresholdRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, ThresholdRule>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAccountType(null);
        setAuthLoading(false);
        return;
      }

      const accountDoc = await getDoc(doc(firestore, "accounts", user.uid));
      const type = accountDoc.data()?.type;

      if (type === "PUBLIC_USER" || type === "CITY_OPERATOR" || type === "SYSTEM_ADMINISTRATOR") {
        setAccountType(type);
      } else {
        setAccountType(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (accountType !== "SYSTEM_ADMINISTRATOR" && accountType !== "CITY_OPERATOR") {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/thresholds`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data: ThresholdRule[]) => {
        setRules(data);
        const editMap: Record<string, ThresholdRule> = {};
        data.forEach((r) => { editMap[r.condition] = { ...r }; });
        setEditing(editMap);
        setLoading(false);
      })
      .catch((err) => {
        setError("Could not load thresholds. Is the backend running? " + err.message);
        setLoading(false);
      });
  }, [accountType, authLoading]);

  const handleChange = (condition: string, field: keyof ThresholdRule, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [condition]: {
        ...prev[condition],
        [field]: field === "operator" ? value : parseFloat(value) || 0,
      },
    }));
  };

  const handleSave = async (condition: string) => {
    const rule = editing[condition];
    setSaving(condition);
    setSaved(null);
    try {
      const res = await fetch(`${API_BASE}/thresholds/${condition}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: rule.operator,
          minThreshold: rule.minThreshold,
          maxThreshold: rule.maxThreshold,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setSaved(condition);
      setTimeout(() => setSaved(null), 2000);
    } catch (err: unknown) {
      setError("Failed to save: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Return to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Alert Thresholds
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          Edit the threshold values for each sensor condition. Changes take effect immediately on the next MQTT reading.
        </p>

        {authLoading && <p className="text-zinc-500 text-sm">Checking permissions...</p>}

        {!authLoading && accountType === "PUBLIC_USER" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-6">
            You do not have permission to manage thresholds.
          </div>
        )}

        {!authLoading && accountType === null && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-6">
            Sign in to manage thresholds.
          </div>
        )}

        {!authLoading && accountType === "PUBLIC_USER" ? null : (
          <>
        {loading && <p className="text-zinc-500 text-sm">Loading thresholds...</p>}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && rules.length === 0 && (
          <p className="text-zinc-500 text-sm">No threshold rules found.</p>
        )}

        <div className="space-y-4">
          {rules.map((rule) => {
            const edit = editing[rule.condition] ?? rule;
            const isSaving = saving === rule.condition;
            const isSaved = saved === rule.condition;

            return (
              <div
                key={rule.condition}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
              >
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                  {CONDITION_LABELS[rule.condition] ?? rule.condition}
                </h2>

                <div className="flex flex-wrap gap-4 items-end">
                  {/* Operator */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Operator</label>
                    <select
                      value={edit.operator}
                      onChange={(e) => handleChange(rule.condition, "operator", e.target.value)}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                    >
                      {Object.entries(OPERATOR_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min threshold (shown for LT and BETWEEN) */}
                  {(edit.operator === "LT" || edit.operator === "BETWEEN") && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-500">
                        {edit.operator === "BETWEEN" ? "Min Value" : "Threshold"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={edit.minThreshold}
                        onChange={(e) => handleChange(rule.condition, "minThreshold", e.target.value)}
                        className="w-28 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  )}

                  {/* Max threshold (shown for GT and BETWEEN) */}
                  {(edit.operator === "GT" || edit.operator === "BETWEEN") && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-500">
                        {edit.operator === "BETWEEN" ? "Max Value" : "Threshold"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={edit.maxThreshold}
                        onChange={(e) => handleChange(rule.condition, "maxThreshold", e.target.value)}
                        className="w-28 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    onClick={() => handleSave(rule.condition)}
                    disabled={isSaving}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isSaved
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    }`}
                  >
                    {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
