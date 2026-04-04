"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getLatestStationReadings, type SensorReading } from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

const STATION_ID = "station-001";
const COLLECTION_NAME = "latest_readings";

const DISPLAY_ORDER = [
  "temperature",
  "humidity",
  "pressure",
  "precipitation",
  "uv_index",
  "wind_speed",
] as const;

const INDICATOR_LABELS: Record<string, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  pressure: "Pressure",
  precipitation: "Precipitation",
  uv_index: "UV Index",
  wind_speed: "Wind Speed",
};

export default function Home() {
  const [readingsByType, setReadingsByType] = useState<Record<string, SensorReading>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const upsertReadings = (readings: SensorReading[]) => {
      setReadingsByType((previous) => {
        const next = { ...previous };

        for (const reading of readings) {
          const prevReading = next[reading.indicatorType];
          if (!prevReading || Number(reading.timestamp) >= Number(prevReading.timestamp)) {
            next[reading.indicatorType] = reading;
          }
        }

        return next;
      });
    };

    const loadInitialReadings = async () => {
      try {
        const initialReadings = await getLatestStationReadings(STATION_ID);
        if (mounted) {
          upsertReadings(initialReadings);
        }
      } catch (apiError) {
        if (mounted) {
          setError(apiError instanceof Error ? apiError.message : "Failed to fetch initial sensor readings");
        }
      }
    };

    loadInitialReadings();

    const readingQuery = query(
      collection(firestore, COLLECTION_NAME),
      where("stationId", "==", STATION_ID),
    );

    const unsubscribe = onSnapshot(
      readingQuery,
      (snapshot) => {
        setError(null);
        if (snapshot.empty) {
          return;
        }

        const incomingReadings = snapshot.docs.map((doc) => doc.data() as SensorReading);
        upsertReadings(incomingReadings);
      },
      (firebaseError) => {
        setError(firebaseError.message);
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const displayReadings = useMemo(() => {
    const ordered = DISPLAY_ORDER
      .map((indicatorType) => readingsByType[indicatorType])
      .filter((reading): reading is SensorReading => Boolean(reading));
    const unordered = Object.values(readingsByType).filter(
      (reading) => !DISPLAY_ORDER.includes(reading.indicatorType as (typeof DISPLAY_ORDER)[number]),
    );
    return [...ordered, ...unordered];
  }, [readingsByType]);

  const lastUpdated = useMemo(() => {
    const timestamps = Object.values(readingsByType)
      .map((reading) => Number(reading.timestamp))
      .filter((value) => Number.isFinite(value));

    if (timestamps.length === 0) {
      return "No timestamp in payload";
    }

    const latestUnixSeconds = Math.max(...timestamps);
    return new Date(latestUnixSeconds * 1000).toLocaleString();
  }, [readingsByType]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Realtime Sensor Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Station: <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">{STATION_ID}</code> ·
            Collection: <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">{COLLECTION_NAME}</code>
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
            Data error: {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayReadings.map((reading) => (
            <StatCard key={reading.indicatorType} reading={reading} />
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-700">
          <p>
            <span className="font-medium">Last updated:</span> {lastUpdated}
          </p>
        </div>

        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <summary className="cursor-pointer text-sm font-medium">Raw payload</summary>
          <pre className="mt-3 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
            {JSON.stringify(displayReadings, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}

function StatCard({ reading }: { reading: SensorReading }) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {INDICATOR_LABELS[reading.indicatorType] ?? reading.indicatorType}
      </p>
      <p className="mt-1 text-2xl font-semibold">
        {reading.value} {reading.unit}
      </p>
    </article>
  );
}
