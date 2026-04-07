"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { fetchAggregated5MinuteData, type AggregatedReading, type SensorReading } from "@/api/apiClient";
import { firestore } from "@/lib/firebase";

type MarkerInstance = {
  setLatLng: (coords: [number, number]) => void;
  bindPopup: (html: string) => MarkerInstance;
  addTo: (map: MapInstance) => MarkerInstance;
  remove: () => void;
};

type MapInstance = {
  fitBounds: (bounds: [number, number][], options?: { padding?: [number, number] }) => MapInstance;
  setView: (center: [number, number], zoom: number) => MapInstance;
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
const CHART_COLORS = ["#34d399", "#38bdf8", "#f97316", "#a78bfa", "#facc15", "#f472b6", "#fb7185"];

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

function formatLine(points: AggregatedReading[], xMin: number, xSpan: number, yMin: number, ySpan: number) {
  const width = 920;
  const height = 280;
  const leftPad = 50;
  const rightPad = 24;
  const topPad = 18;
  const bottomPad = 38;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;

  return points
    .map((point, index) => {
      const x = leftPad + ((point.bucketStartEpoch - xMin) / xSpan) * plotWidth;
      const y = topPad + plotHeight - ((point.average - yMin) / ySpan) * plotHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function DashboardPage() {
  const [readingsByStation, setReadingsByStation] = useState<Record<string, Record<string, SensorReading>>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string>("temperature");
  const [aggregatesByStation, setAggregatesByStation] = useState<Record<string, AggregatedReading[]>>({});
  const [aggregateError, setAggregateError] = useState<string | null>(null);
  const [isLoadingAggregate, setIsLoadingAggregate] = useState(false);

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
    const loadAggregates = async () => {
      if (stationSummaries.length === 0) {
        setAggregatesByStation({});
        return;
      }

      setIsLoadingAggregate(true);
      setAggregateError(null);

      try {
        const results = await Promise.all(
          stationSummaries.map(async (station) => {
            const points = await fetchAggregated5MinuteData(station.stationId, selectedIndicator);
            return [station.stationId, points] as const;
          }),
        );

        const next: Record<string, AggregatedReading[]> = {};
        for (const [stationId, points] of results) {
          next[stationId] = points
            .slice()
            .sort((a, b) => a.bucketStartEpoch - b.bucketStartEpoch)
            .slice(-48);
        }

        setAggregatesByStation(next);
      } catch (aggregateFetchError) {
        setAggregateError(
          aggregateFetchError instanceof Error
            ? aggregateFetchError.message
            : "Failed to fetch aggregated station data.",
        );
      } finally {
        setIsLoadingAggregate(false);
      }
    };

    loadAggregates();
  }, [selectedIndicator, stationSummaries]);

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

  const chartSeries = useMemo(() => {
    return Object.entries(aggregatesByStation)
      .map(([stationId, points]) => ({
        stationId,
        points: points.filter((point) => Number.isFinite(point.average) && Number.isFinite(point.bucketStartEpoch)),
      }))
      .filter((series) => series.points.length > 0)
      .sort((a, b) => a.stationId.localeCompare(b.stationId));
  }, [aggregatesByStation]);

  const chartBounds = useMemo(() => {
    if (chartSeries.length === 0) {
      return null;
    }

    const allPoints = chartSeries.flatMap((series) => series.points);
    const xMin = Math.min(...allPoints.map((point) => point.bucketStartEpoch));
    const xMax = Math.max(...allPoints.map((point) => point.bucketStartEpoch));
    const yMinRaw = Math.min(...allPoints.map((point) => point.average));
    const yMaxRaw = Math.max(...allPoints.map((point) => point.average));

    const xSpan = Math.max(1, xMax - xMin);
    const yPadding = Math.max(0.1, (yMaxRaw - yMinRaw) * 0.08);
    const yMin = yMinRaw - yPadding;
    const yMax = yMaxRaw + yPadding;
    const ySpan = Math.max(1, yMax - yMin);

    return { xMin, xMax, yMin, yMax, xSpan, ySpan };
  }, [chartSeries]);

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

      <section className="mx-auto mb-6 w-full max-w-[1500px] rounded-2xl border border-zinc-800 bg-[#0a101c] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold">5-Minute Aggregated Trend (All Stations)</h2>
            <p className="text-xs text-zinc-400">Average value per station from /api/data-management/aggregation/:stationId/5mins</p>
          </div>

          <label className="text-xs text-zinc-300">
            Indicator
            <select
              className="ml-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={selectedIndicator}
              onChange={(event) => setSelectedIndicator(event.target.value)}
            >
              {DISPLAY_ORDER.map((indicator) => (
                <option key={indicator} value={indicator}>
                  {INDICATOR_LABELS[indicator]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {aggregateError ? (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">{aggregateError}</p>
        ) : null}

        {isLoadingAggregate ? <p className="text-sm text-zinc-400">Loading aggregated data...</p> : null}

        {!isLoadingAggregate && chartBounds && chartSeries.length > 0 ? (
          <div>
            <svg viewBox="0 0 920 280" className="w-full overflow-visible rounded-lg border border-zinc-800 bg-[#04070e]">
              <line x1="50" y1="18" x2="50" y2="242" stroke="#3f3f46" strokeWidth="1" />
              <line x1="50" y1="242" x2="896" y2="242" stroke="#3f3f46" strokeWidth="1" />

              {chartSeries.map((series, index) => (
                <path
                  key={series.stationId}
                  d={formatLine(
                    series.points,
                    chartBounds.xMin,
                    chartBounds.xSpan,
                    chartBounds.yMin,
                    chartBounds.ySpan,
                  )}
                  fill="none"
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              <text x="56" y="20" fill="#a1a1aa" fontSize="11">
                {chartBounds.yMax.toFixed(2)}
              </text>
              <text x="56" y="238" fill="#a1a1aa" fontSize="11">
                {chartBounds.yMin.toFixed(2)}
              </text>

              <text x="50" y="262" fill="#a1a1aa" fontSize="11">
                {new Date(chartBounds.xMin * 1000).toLocaleTimeString()}
              </text>
              <text x="760" y="262" fill="#a1a1aa" fontSize="11">
                {new Date(chartBounds.xMax * 1000).toLocaleTimeString()}
              </text>
            </svg>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
              {chartSeries.map((series, index) => (
                <span key={series.stationId} className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {series.stationId}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoadingAggregate && chartSeries.length === 0 ? (
          <p className="text-sm text-zinc-400">No aggregated data found for the selected indicator yet.</p>
        ) : null}
      </section>
    </div>
  );
}
