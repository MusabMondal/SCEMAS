"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getLatestStationReadings, type SensorReading } from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

const STATION_ID = "station-001";
const COLLECTION_NAME = "latest_readings";
const FALLBACK_COORDS = { latitude: 43.6532, longitude: -79.3832 };

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

  const latestReading = useMemo(
    () =>
      Object.values(readingsByType).reduce<SensorReading | null>((latest, current) => {
        if (!latest) {
          return current;
        }

        return Number(current.timestamp) > Number(latest.timestamp) ? current : latest;
      }, null),
    [readingsByType],
  );

  const lastUpdated = useMemo(() => {
    if (!latestReading?.timestamp) {
      return "No timestamp in payload";
    }

    return new Date(Number(latestReading.timestamp) * 1000).toLocaleString();
  }, [latestReading]);

  const markerPosition = useMemo(() => {
    const latitude = latestReading?.latitude ?? FALLBACK_COORDS.latitude;
    const longitude = latestReading?.longitude ?? FALLBACK_COORDS.longitude;

    const left = ((longitude + 180) / 360) * 100;
    const top = ((90 - latitude) / 180) * 100;

    return {
      left: `${Math.min(98, Math.max(2, left))}%`,
      top: `${Math.min(98, Math.max(2, top))}%`,
      latitude,
      longitude,
    };
  }, [latestReading]);

  return (
    <div className="min-h-screen bg-[#04070e] text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-[#050a13]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="h-6 w-10 rounded-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400" />
            <span className="text-sm font-semibold tracking-[0.2em] text-emerald-300">SCEMAS</span>
          </Link>

          <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500">
            Login
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-6 xl:h-[calc(100vh-4rem)] xl:flex-row">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#050a13]">
          <WorldMapBackdrop />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_70%_45%,rgba(56,189,248,0.20),transparent_45%),linear-gradient(180deg,rgba(4,12,22,0.45),rgba(1,5,12,0.82))]" />

          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:130px_130px]" />

          <div
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: markerPosition.left, top: markerPosition.top }}
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/80" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_3px_rgba(16,185,129,0.5)]" />
            </span>
            <p className="rounded bg-black/55 px-2 py-1 text-xs font-semibold text-emerald-300">{STATION_ID}</p>
          </div>

          <div className="absolute bottom-4 left-4 rounded-lg border border-zinc-700/80 bg-black/60 px-3 py-2 text-xs text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-100">Collection:</span> {COLLECTION_NAME}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Coordinates:</span> {markerPosition.latitude.toFixed(4)}, {" "}
              {markerPosition.longitude.toFixed(4)}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Last updated:</span> {lastUpdated}
            </p>
          </div>
        </section>

        <aside className="w-full rounded-2xl border border-zinc-800 bg-[#0a101c] p-4 xl:w-[360px]">
          <div className="mb-4 border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-semibold">Live Indicators</h2>
            <p className="text-xs text-zinc-400">Realtime updates for {STATION_ID}</p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">{error}</p>
          ) : null}

          <div className="space-y-3">
            {displayReadings.map((reading) => (
              <article
                key={reading.indicatorType}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-widest text-zinc-400">
                  {INDICATOR_LABELS[reading.indicatorType] ?? reading.indicatorType}
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-300">
                  {reading.value} <span className="text-sm text-zinc-300">{reading.unit}</span>
                </p>
              </article>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}


function WorldMapBackdrop() {
  return (
    <svg
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full opacity-55"
      aria-hidden
    >
      <rect x="0" y="0" width="1000" height="500" fill="#0a1220" />
      <g fill="#374151" stroke="#4b5563" strokeWidth="1.5">
        <path d="M45 120 L95 95 L170 90 L225 110 L248 150 L224 175 L180 188 L145 205 L95 198 L58 165 Z" />
        <path d="M185 205 L238 220 L268 248 L255 285 L208 305 L172 292 L163 245 Z" />
        <path d="M295 105 L342 82 L387 96 L426 132 L411 165 L361 176 L314 150 Z" />
        <path d="M325 190 L374 205 L404 238 L384 286 L336 318 L287 292 L281 238 Z" />
        <path d="M450 92 L503 78 L557 88 L603 119 L595 162 L545 178 L486 164 L444 130 Z" />
        <path d="M520 190 L578 199 L622 228 L612 282 L568 318 L508 334 L465 302 L472 248 Z" />
        <path d="M592 176 L654 165 L702 190 L722 222 L706 256 L656 264 L621 238 Z" />
        <path d="M705 258 L748 246 L796 262 L836 296 L826 334 L786 354 L739 344 L698 312 Z" />
        <path d="M798 126 L848 108 L902 128 L934 158 L922 198 L876 218 L826 204 L794 168 Z" />
        <path d="M884 306 L921 300 L956 318 L962 346 L942 368 L906 372 L882 352 Z" />
      </g>
    </svg>
  );
}
