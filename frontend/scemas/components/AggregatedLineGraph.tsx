"use client";

import { useMemo } from "react";
import type { AggregatedDataPoint } from "@/api/apiClient";

type StationSeries = {
  stationId: string;
  points: AggregatedDataPoint[];
};

type AggregatedLineGraphProps = {
  series: StationSeries[];
};

const COLORS = ["#34d399", "#38bdf8", "#f472b6", "#a78bfa", "#fbbf24", "#fb7185"];

export function AggregatedLineGraph({ series }: AggregatedLineGraphProps) {
  const graph = useMemo(() => {
    const normalizedSeries = series.map((stationSeries) => ({
      ...stationSeries,
      points: [...stationSeries.points].sort((a, b) => a.timestamp - b.timestamp),
    }));

    const merged = normalizedSeries.flatMap((item) => item.points.map((point) => ({ ...point, stationId: item.stationId })));

    if (!merged.length) {
      return null;
    }

    const minX = Math.min(...merged.map((point) => point.timestamp));
    const maxX = Math.max(...merged.map((point) => point.timestamp));
    const minY = Math.min(...merged.map((point) => point.value));
    const maxY = Math.max(...merged.map((point) => point.value));

    const width = 960;
    const height = 320;
    const padding = 34;

    const scaleX = (value: number) => {
      if (maxX === minX) {
        return width / 2;
      }

      return padding + ((value - minX) / (maxX - minX)) * (width - padding * 2);
    };

    const scaleY = (value: number) => {
      if (maxY === minY) {
        return height / 2;
      }

      return height - padding - ((value - minY) / (maxY - minY)) * (height - padding * 2);
    };

    return { width, height, padding, minY, maxY, scaleX, scaleY, normalizedSeries };
  }, [series]);

  if (!graph) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        Aggregated data will appear after stations stream in.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="w-full">
        <line
          x1={graph.padding}
          y1={graph.height - graph.padding}
          x2={graph.width - graph.padding}
          y2={graph.height - graph.padding}
          stroke="#52525b"
        />
        <line
          x1={graph.padding}
          y1={graph.padding}
          x2={graph.padding}
          y2={graph.height - graph.padding}
          stroke="#52525b"
        />

        {graph.normalizedSeries.map((stationSeries, index) => {
          const color = COLORS[index % COLORS.length];

          if (!stationSeries.points.length) {
            return null;
          }

          const d = stationSeries.points
            .map((point, pointIndex) => {
              const x = graph.scaleX(point.timestamp);
              const y = graph.scaleY(point.value);
              return `${pointIndex === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

          return (
            <g key={stationSeries.stationId}>
              {stationSeries.points.length > 1 ? <path d={d} fill="none" stroke={color} strokeWidth="2" /> : null}

              {stationSeries.points.map((point, pointIndex) => (
                <circle
                  key={`${stationSeries.stationId}-${point.timestamp}-${pointIndex}`}
                  cx={graph.scaleX(point.timestamp)}
                  cy={graph.scaleY(point.value)}
                  r={4}
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {series.map((stationSeries, index) => (
          <div key={stationSeries.stationId} className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-zinc-300">{stationSeries.stationId}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Range: {graph.minY.toFixed(2)} - {graph.maxY.toFixed(2)}
      </p>
    </div>
  );
}
