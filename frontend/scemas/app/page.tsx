"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  fetchActiveAlerts,
  fetchLatestStationReadings,
  type Alert,
  type SensorReading,
} from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

type LeafletMap = {
  flyTo: (coords: [number, number], zoom: number, options?: { duration?: number; easeLinearity?: number }) => void;
  once: (event: string, handler: () => void) => void;
  remove: () => void;
};

type LeafletMarker = {
  setLatLng: (coords: [number, number]) => void;
};

type LeafletNamespace = {
  map: (
    element: HTMLDivElement,
    options: { zoomControl: boolean; worldCopyJump: boolean },
  ) => LeafletMap & { setView: (coords: [number, number], zoom: number) => LeafletMap };
  tileLayer: (
    url: string,
    options: { maxZoom: number; attribution: string },
  ) => { addTo: (map: LeafletMap) => void };
  marker: (coords: [number, number]) => { addTo: (map: LeafletMap) => LeafletMarker };
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const STATION_ID = "station-001";
const COLLECTION_NAME = "latest_readings";
const FALLBACK_COORDS = { latitude: 43.6532, longitude: -79.3832 };
const ALERT_REFRESH_INTERVAL_MS = 60_000;

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
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [alertIndex, setAlertIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [isFlying, setIsFlying] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

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
    let mounted = true;
    let intervalId: number | undefined;

    const syncAlerts = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const alerts = await fetchActiveAlerts(STATION_ID);
        if (!mounted) {
          return;
        }

        setActiveAlerts(alerts);
        setAlertError(null);
        setAlertIndex((previous) => {
          if (alerts.length === 0) {
            return 0;
          }

          return Math.min(previous, alerts.length - 1);
        });
      } catch (apiError) {
        if (!mounted) {
          return;
        }

        setAlertError(apiError instanceof Error ? apiError.message : "Failed to fetch active alerts");
      }
    };

    const startPolling = () => {
      void syncAlerts();

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        void syncAlerts();
      }, ALERT_REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncAlerts();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (intervalId) {
        window.clearInterval(intervalId);
      }
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
  }, [markerCoordinates.latitude, markerCoordinates.longitude]);

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

  const hasAlerts = activeAlerts.length > 0;
  const activeAlert = hasAlerts ? activeAlerts[alertIndex] : null;

  const activeAlertTimestamp = useMemo(() => {
    if (!activeAlert?.createdAt) {
      return null;
    }

    const createdDate = new Date(activeAlert.createdAt);
    return Number.isNaN(createdDate.getTime()) ? activeAlert.createdAt : createdDate.toLocaleString();
  }, [activeAlert]);

  const cycleAlert = (direction: "next" | "previous") => {
    setAlertIndex((previous) => {
      if (activeAlerts.length === 0) {
        return 0;
      }

      if (direction === "next") {
        return (previous + 1) % activeAlerts.length;
      }

      return (previous - 1 + activeAlerts.length) % activeAlerts.length;
    });
  };

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
          <div
            ref={mapContainerRef}
            className="h-full min-h-[620px] w-full [filter:invert(1)_hue-rotate(180deg)_brightness(0.55)_contrast(1.1)_saturate(0.75)]"
          />

          {isFlying ? (
            <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-zinc-700/80 bg-black/55 px-4 py-2 text-xs tracking-[0.18em] text-zinc-200">
              Flying to Toronto...
            </div>
          ) : null}

          {hasAlerts || alertError ? (
            <div className="absolute right-4 top-4 z-30 w-[min(420px,calc(100%-2rem))] rounded-2xl border border-amber-400/40 bg-[#130c08]/92 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-amber-300">
                    Active Alerts
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                    {hasAlerts ? "Station conditions require attention" : "Alert feed unavailable"}
                  </h2>
                </div>

                {hasAlerts ? (
                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                    {alertIndex + 1}/{activeAlerts.length}
                  </span>
                ) : null}
              </div>

              {activeAlert ? (
                <>
                  <div className="rounded-2xl border border-amber-200/10 bg-black/25 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-amber-200">
                        {activeAlert.severity}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-zinc-300">
                        {activeAlert.condition ?? "Manual"}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-zinc-100">{activeAlert.message}</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-300">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                        <p className="uppercase tracking-[0.18em] text-zinc-500">Station</p>
                        <p className="mt-1 font-medium text-zinc-100">{activeAlert.stationId}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                        <p className="uppercase tracking-[0.18em] text-zinc-500">Value</p>
                        <p className="mt-1 font-medium text-zinc-100">{activeAlert.value}</p>
                      </div>
                    </div>

                    {activeAlertTimestamp ? (
                      <p className="mt-4 text-xs text-zinc-400">Triggered {activeAlertTimestamp}</p>
                    ) : null}
                  </div>

                  {activeAlerts.length > 1 ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-400">
                        Polling once per minute while this tab is visible.
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cycleAlert("previous")}
                          className="rounded-full border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 transition hover:border-amber-300/60 hover:text-amber-100"
                          aria-label="Show previous alert"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => cycleAlert("next")}
                          className="rounded-full border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 transition hover:border-amber-300/60 hover:text-amber-100"
                          aria-label="Show next alert"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-400">
                      Polling once per minute while this tab is visible.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm leading-6 text-red-100">{alertError}</p>
              )}
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
