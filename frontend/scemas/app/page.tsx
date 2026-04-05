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

  const markerCoordinates = useMemo(() => {
    const latitude = latestReading?.latitude ?? FALLBACK_COORDS.latitude;
    const longitude = latestReading?.longitude ?? FALLBACK_COORDS.longitude;
    return { latitude, longitude };
  }, [latestReading]);

  const mapEmbedUrl = useMemo(() => {
    const { latitude, longitude } = markerCoordinates;
    const minLon = longitude - 0.22;
    const maxLon = longitude + 0.22;
    const minLat = latitude - 0.12;
    const maxLat = latitude + 0.12;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
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

          <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500">
            Login
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-6 xl:h-[calc(100vh-4rem)] xl:flex-row">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#050a13]">
          <iframe
            title="SCEMAS live station map"
            src={mapEmbedUrl}
            className="h-full min-h-[620px] w-full"
          />

          <div className="absolute bottom-4 left-4 z-30 rounded-lg border border-zinc-700/80 bg-black/60 px-3 py-2 text-xs text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-100">Collection:</span> {COLLECTION_NAME}
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
