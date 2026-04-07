"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { type SensorReading } from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

type MarkerInstance = {
  setLatLng: (coords: [number, number]) => void;
  bindPopup: (html: string) => MarkerInstance;
  addTo: (map: MapInstance) => MarkerInstance;
  remove: () => void;
};

type MapInstance = {
  fitBounds: (bounds: [number, number][], options?: { padding?: [number, number] }) => void;
  setView: (center: [number, number], zoom: number) => void;
  remove: () => void;
};

type LeafletFactory = {
  map: (target: HTMLDivElement, options: { zoomControl: boolean; worldCopyJump: boolean }) => MapInstance;
  tileLayer: (
    urlTemplate: string,
    options: { maxZoom: number; attribution: string },
  ) => { addTo: (map: MapInstance) => void };
  marker: (coords: [number, number]) => MarkerInstance;
};

declare global {
  interface Window {
    L?: LeafletFactory;
  }
}

const COLLECTION_NAME = "latest_readings";
const FALLBACK_CENTER: [number, number] = [43.6532, -79.3832];

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

export default function DashboardPage() {
  const [readingsByStation, setReadingsByStation] = useState<Record<string, Record<string, SensorReading>>>({});
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersByStationRef = useRef<Record<string, MarkerInstance>>({});
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    const readingsCollection = collection(firestore, COLLECTION_NAME);

    const unsubscribe = onSnapshot(
      readingsCollection,
      (snapshot) => {
        setError(null);

        if (snapshot.empty) {
          setReadingsByStation({});
          return;
        }

        const next: Record<string, Record<string, SensorReading>> = {};

        for (const doc of snapshot.docs) {
          const reading = doc.data() as SensorReading;
          const stationReadings = next[reading.stationId] ?? {};
          const previous = stationReadings[reading.indicatorType];

          if (!previous || Number(reading.timestamp) >= Number(previous.timestamp)) {
            stationReadings[reading.indicatorType] = reading;
          }

          next[reading.stationId] = stationReadings;
        }

        setReadingsByStation(next);
      },
      (firebaseError) => {
        setError(firebaseError.message);
      },
    );

    return () => unsubscribe();
  }, []);

  const stationSummaries = useMemo(() => {
    return Object.entries(readingsByStation)
      .map(([stationId, readingsMap]) => {
        const readings = Object.values(readingsMap);
        const latest = readings.reduce<SensorReading | null>((latestReading, currentReading) => {
          if (!latestReading) {
            return currentReading;
          }

          return Number(currentReading.timestamp) > Number(latestReading.timestamp) ? currentReading : latestReading;
        }, null);

        return {
          stationId,
          readings,
          latest,
          latitude: latest?.latitude ?? FALLBACK_CENTER[0],
          longitude: latest?.longitude ?? FALLBACK_CENTER[1],
        };
      })
      .sort((a, b) => a.stationId.localeCompare(b.stationId));
  }, [readingsByStation]);

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
      }).setView(FALLBACK_CENTER, 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
      cleanup = () => {
        map.remove();
        mapRef.current = null;
        markersByStationRef.current = {};
      };
    };

    setupLeafletMap().catch(() => {
      setError("Failed to initialize map rendering.");
    });

    return () => cleanup?.();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;

    if (!map || !L) {
      return;
    }

    const stationIds = new Set(stationSummaries.map((station) => station.stationId));

    for (const [stationId, marker] of Object.entries(markersByStationRef.current)) {
      if (!stationIds.has(stationId)) {
        marker.remove();
        delete markersByStationRef.current[stationId];
      }
    }

    const boundsPoints: [number, number][] = [];

    for (const station of stationSummaries) {
      const coordinates: [number, number] = [station.latitude, station.longitude];
      boundsPoints.push(coordinates);

      const popup = `<strong>${station.stationId}</strong><br/>Sensors: ${station.readings.length}`;
      const existingMarker = markersByStationRef.current[station.stationId];

      if (existingMarker) {
        existingMarker.setLatLng(coordinates);
        existingMarker.bindPopup(popup);
      } else {
        markersByStationRef.current[station.stationId] = L.marker(coordinates).addTo(map).bindPopup(popup);
      }
    }

    if (!hasCenteredRef.current) {
      if (boundsPoints.length > 1) {
        map.fitBounds(boundsPoints, { padding: [40, 40] });
      } else if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 11);
      }

      hasCenteredRef.current = true;
    }
  }, [stationSummaries]);

  const totalSensors = useMemo(
    () => stationSummaries.reduce((sum, station) => sum + station.readings.length, 0),
    [stationSummaries],
  );

  return (
    <div className="min-h-screen bg-[#04070e] text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-[#050a13]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="h-6 w-10 rounded-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400" />
            <span className="text-sm font-semibold tracking-[0.2em] text-emerald-300">SCEMAS</span>
          </Link>

          <p className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100">
            Dashboard (all stations)
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-6 xl:h-[calc(100vh-4rem)] xl:flex-row">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#050a13]">
          <div
            ref={mapContainerRef}
            className="h-full min-h-[620px] w-full [filter:invert(1)_hue-rotate(180deg)_brightness(0.55)_contrast(1.1)_saturate(0.75)]"
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_70%_45%,rgba(56,189,248,0.14),transparent_45%)]" />

          <div className="absolute bottom-4 left-4 z-30 rounded-lg border border-zinc-700/80 bg-black/60 px-3 py-2 text-xs text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-100">Collection:</span> {COLLECTION_NAME}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Stations:</span> {stationSummaries.length}
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Sensors:</span> {totalSensors}
            </p>
          </div>
        </section>

        <aside className="w-full rounded-2xl border border-zinc-800 bg-[#0a101c] p-4 xl:w-[420px]">
          <div className="mb-4 border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-semibold">Live Sensors by Station</h2>
            <p className="text-xs text-zinc-400">Realtime updates for all stations in Firestore</p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">{error}</p>
          ) : null}

          <div className="max-h-[68vh] space-y-3 overflow-auto pr-2">
            {stationSummaries.map((station) => {
              const orderedReadings = DISPLAY_ORDER
                .map((indicatorType) => station.readings.find((reading) => reading.indicatorType === indicatorType))
                .filter((reading): reading is SensorReading => Boolean(reading));

              const remainingReadings = station.readings.filter(
                (reading) => !DISPLAY_ORDER.includes(reading.indicatorType as (typeof DISPLAY_ORDER)[number]),
              );

              const readingsToDisplay = [...orderedReadings, ...remainingReadings];

              return (
                <article key={station.stationId} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <h3 className="text-sm font-semibold text-emerald-300">{station.stationId}</h3>
                  <p className="mb-2 text-xs text-zinc-400">
                    Last updated:{" "}
                    {station.latest?.timestamp
                      ? new Date(Number(station.latest.timestamp) * 1000).toLocaleString()
                      : "No timestamp"}
                  </p>

                  <div className="space-y-2">
                    {readingsToDisplay.map((reading) => (
                      <div
                        key={`${station.stationId}-${reading.indicatorType}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                      >
                        <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                          {INDICATOR_LABELS[reading.indicatorType] ?? reading.indicatorType}
                        </p>
                        <p className="text-base font-semibold text-zinc-100">
                          {reading.value} <span className="text-xs text-zinc-400">{reading.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
