"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  fetchAlertsForStation,
  fetchLatestStationReadings,
  type SensorReading,
  type StationAlert,
} from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

declare global {
  interface Window {
    L?: any;
  }
}

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
  const [isFlying, setIsFlying] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<StationAlert[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
        const initialReadings = await fetchLatestStationReadings(STATION_ID);
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

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const alerts = await fetchAlertsForStation(STATION_ID);

        if (!cancelled) {
          setActiveAlerts(alerts.filter((alert) => alert.status === "ACTIVE"));
          setAlertError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setAlertError(fetchError instanceof Error ? fetchError.message : "Failed to load alerts.");
        }
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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

  const markerCoordinates = useMemo(() => {
    const latitude = latestReading?.latitude ?? FALLBACK_COORDS.latitude;
    const longitude = latestReading?.longitude ?? FALLBACK_COORDS.longitude;
    return { latitude, longitude };
  }, [latestReading]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupLeafletMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Leaflet"));
          document.body.appendChild(script);
        });
      }

      const L = window.L;
      if (!L || !mapContainerRef.current) {
        return;
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        worldCopyJump: true,
      }).setView([18, 0], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      markerRef.current = L.marker([markerCoordinates.latitude, markerCoordinates.longitude]).addTo(map);
      mapRef.current = map;

      const flyTimer = window.setTimeout(() => {
        map.flyTo([markerCoordinates.latitude, markerCoordinates.longitude], 11, {
          duration: 2.8,
          easeLinearity: 0.25,
        });
      }, 800);

      map.once("moveend", () => {
        setIsFlying(false);
      });

      cleanup = () => {
        window.clearTimeout(flyTimer);
        map.remove();
        mapRef.current = null;
      };
    };

    setupLeafletMap().catch(() => {
      setError("Failed to initialize map rendering.");
    });

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }

    markerRef.current.setLatLng([markerCoordinates.latitude, markerCoordinates.longitude]);
  }, [markerCoordinates]);

  const lastUpdated = useMemo(() => {
    if (!latestReading?.timestamp) {
      return "No timestamp in payload";
    }

    return new Date(Number(latestReading.timestamp) * 1000).toLocaleString();
  }, [latestReading]);

  return (
    <div className="min-h-screen bg-[#04070e] text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-[#050a13]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="h-6 w-10 rounded-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400" />
            <span className="text-sm font-semibold tracking-[0.2em] text-emerald-300">SCEMAS</span>
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-6 xl:h-[calc(100vh-4rem)] xl:flex-row">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#050a13]">
          <div
            ref={mapContainerRef}
            className="h-full min-h-[620px] w-full [filter:invert(1)_hue-rotate(180deg)_brightness(0.55)_contrast(1.1)_saturate(0.75)]"
          />

          <div className="absolute left-4 top-4 z-30 w-[min(430px,calc(100%-2rem))] rounded-xl border border-zinc-700/80 bg-black/70 p-3 text-xs text-zinc-200">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">Active Alerts ({STATION_ID})</p>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${activeAlerts.length > 0 ? "bg-red-600/80 text-red-50" : "bg-emerald-700/70 text-emerald-50"}`}>
                {activeAlerts.length > 0 ? `${activeAlerts.length} active` : "No active alerts"}
              </span>
            </div>

            {alertError ? <p className="mb-2 text-red-300">{alertError}</p> : null}

            <div className="max-h-28 space-y-1 overflow-auto pr-1">
              {activeAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-md border border-red-500/30 bg-red-950/40 px-2 py-1">
                  <p className="font-semibold text-red-200">{alert.condition}</p>
                  <p className="truncate text-zinc-200">{alert.message}</p>
                </div>
              ))}

              {activeAlerts.length === 0 ? <p className="text-zinc-300">No triggered alerts right now.</p> : null}
            </div>
          </div>

          {isFlying ? (
            <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-zinc-700/80 bg-black/55 px-4 py-2 text-xs tracking-[0.18em] text-zinc-200">
              Flying to Toronto...
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_70%_45%,rgba(56,189,248,0.14),transparent_45%)]" />

          <div className="absolute bottom-4 left-4 z-30 rounded-lg border border-zinc-700/80 bg-black/60 px-3 py-2 text-xs text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-100">Collection:</span> {COLLECTION_NAME}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Map view:</span> {isFlying ? "World → Toronto" : "Toronto"}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Coordinates:</span> {markerCoordinates.latitude.toFixed(4)}, {" "}
              {markerCoordinates.longitude.toFixed(4)}
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