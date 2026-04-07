"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { type AggregatedDataPoint, fetchStationAggregatedData, type SensorReading } from "@/api/apiClient";
import { AggregatedLineGraph } from "@/components/AggregatedLineGraph";
import { StationMap } from "@/components/StationMap";
import { firestore } from "@/lib/firebase";
import { DISPLAY_ORDER, INDICATOR_LABELS, sortReadingsForDisplay, upsertLatestByIndicator } from "@/lib/sensorReadings";

const COLLECTION_NAME = "latest_readings";
const DEFAULT_AGGREGATION_INTERVAL = "5mins";
const DEFAULT_INDICATOR = "temperature";

type ReadingsByStation = Record<string, Record<string, SensorReading>>;

export default function DashboardPage() {
  const [readingsByStation, setReadingsByStation] = useState<ReadingsByStation>({});
  const [aggregatedDataByStation, setAggregatedDataByStation] = useState<Record<string, AggregatedDataPoint[]>>({});
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [aggregationInterval, setAggregationInterval] = useState(DEFAULT_AGGREGATION_INTERVAL);
  const [aggregationIndicatorType, setAggregationIndicatorType] = useState(DEFAULT_INDICATOR);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readingCollection = collection(firestore, COLLECTION_NAME);

    const unsubscribe = onSnapshot(
      readingCollection,
      (snapshot) => {
        setError(null);

        if (snapshot.empty) {
          return;
        }

        setReadingsByStation((previous) => {
          const next = { ...previous };

          for (const doc of snapshot.docs) {
            const reading = doc.data() as SensorReading;
            const previousStationReadings = next[reading.stationId] ?? {};
            next[reading.stationId] = upsertLatestByIndicator(previousStationReadings, [reading]);
          }

          return next;
        });
      },
      (firebaseError) => {
        setError(firebaseError.message);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const stationIds = useMemo(() => Object.keys(readingsByStation).sort(), [readingsByStation]);

  const effectiveSelectedStationId = useMemo(() => {
    if (!stationIds.length) {
      return "";
    }

    return stationIds.includes(selectedStationId) ? selectedStationId : stationIds[0];
  }, [selectedStationId, stationIds]);

  useEffect(() => {
    if (!effectiveSelectedStationId) {
      return;
    }

    let active = true;

    const loadAggregatedData = async () => {
      try {
        const selectedStationAggregate = await fetchStationAggregatedData(
          effectiveSelectedStationId,
          aggregationInterval,
          aggregationIndicatorType,
        );

        if (!active) {
          return;
        }

        setAggregatedDataByStation({
          [effectiveSelectedStationId]: selectedStationAggregate,
        });
      } catch (apiError) {
        if (active) {
          setError(apiError instanceof Error ? apiError.message : "Failed to load aggregated data");
        }
      }
    };

    loadAggregatedData();

    return () => {
      active = false;
    };
  }, [aggregationIndicatorType, aggregationInterval, effectiveSelectedStationId]);

  const markers = useMemo(
    () =>
      stationIds
        .map((stationId) => {
          const latestPerStation = Object.values(readingsByStation[stationId] ?? {}).sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );
          const latest = latestPerStation[0];

          if (!latest) {
            return null;
          }

          return {
            stationId,
            latitude: latest.latitude,
            longitude: latest.longitude,
          };
        })
        .filter((marker): marker is { stationId: string; latitude: number; longitude: number } => marker !== null),
    [readingsByStation, stationIds],
  );

  const graphSeries = useMemo(() => {
    if (!effectiveSelectedStationId) {
      return [];
    }

    const stationAggregate = aggregatedDataByStation[effectiveSelectedStationId] ?? [];

    if (stationAggregate.length) {
      return [{ stationId: effectiveSelectedStationId, points: stationAggregate }];
    }

    const fallbackPoints = Object.values(readingsByStation[effectiveSelectedStationId] ?? {})
      .filter((reading) => reading.indicatorType === aggregationIndicatorType)
      .map((reading) => ({
        timestamp: Number(reading.timestamp),
        value: Number(reading.value),
      }));

    return [{ stationId: effectiveSelectedStationId, points: fallbackPoints }];
  }, [aggregatedDataByStation, aggregationIndicatorType, effectiveSelectedStationId, readingsByStation]);

  return (
    <div className="min-h-screen bg-[#04070e] text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-[#050a13]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="h-6 w-10 rounded-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400" />
            <span className="text-sm font-semibold tracking-[0.2em] text-emerald-300">SCEMAS</span>
          </Link>

          <Link href="/" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100">
            Homepage
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-6">
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">{error}</p>
        ) : null}

        <section className="rounded-2xl border border-zinc-800 bg-[#050a13] p-4">
          <h2 className="mb-2 text-lg font-semibold">Station Map</h2>
          <p className="mb-3 text-xs text-zinc-400">All station markers rendered from live reading coordinates.</p>
          <div className="relative overflow-hidden rounded-xl border border-zinc-800">
            <StationMap markers={markers} className="h-[420px] w-full" />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0a101c] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Aggregated Data</h2>

            <select
              value={effectiveSelectedStationId}
              onChange={(event) => setSelectedStationId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            >
              {stationIds.map((stationId) => (
                <option key={stationId} value={stationId}>
                  {stationId}
                </option>
              ))}
            </select>

            <select
              value={aggregationIndicatorType}
              onChange={(event) => setAggregationIndicatorType(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            >
              {DISPLAY_ORDER.map((indicatorType) => (
                <option key={indicatorType} value={indicatorType}>
                  {INDICATOR_LABELS[indicatorType] ?? indicatorType}
                </option>
              ))}
            </select>

            <select
              value={aggregationInterval}
              onChange={(event) => setAggregationInterval(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            >
              <option value="5mins">5 mins</option>
              <option value="15mins">15 mins</option>
              <option value="1hour">1 hour</option>
            </select>
          </div>

          <p className="mb-3 text-xs text-zinc-400">
            Using endpoint: /api/data-management/aggregation/{effectiveSelectedStationId || `{stationId}`}/{aggregationInterval}
            ?indicatorType={aggregationIndicatorType}
          </p>
          <AggregatedLineGraph series={graphSeries} />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0a101c] p-4">
          <h2 className="mb-3 text-lg font-semibold">Live Station Sensor Readings</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {stationIds.map((stationId) => {
              const stationReadings = sortReadingsForDisplay(readingsByStation[stationId] ?? {});

              return (
                <article key={stationId} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold tracking-wide text-emerald-300">{stationId}</h3>
                  <div className="space-y-2">
                    {stationReadings.map((reading) => (
                      <div
                        key={`${stationId}-${reading.indicatorType}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2"
                      >
                        <span className="text-xs text-zinc-400">
                          {INDICATOR_LABELS[reading.indicatorType] ?? reading.indicatorType}
                        </span>
                        <span className="text-sm font-medium text-zinc-100">
                          {reading.value} {reading.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
