const API_ROOT = process.env.NEXT_PUBLIC_API_ROOT || "http://localhost:8080";
const SENSOR_API_BASE_URL = process.env.API_BASE_URL || `${API_ROOT}/api`;

export type SensorReading = {
  unit: string;
  indicatorType: string;
  latitude: number;
  longitude: number;
  value: number;
  sensorId: string;
  stationId: string;
  timestamp: string;
};

export type AggregatedDataPoint = {
  timestamp: number;
  value: number;
};

export async function fetchLatestStationReadings(stationId: string): Promise<SensorReading[]> {
  const response = await fetch(`${SENSOR_API_BASE_URL}/sensor/${stationId}/latest`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch latest station readings");
  }

  const payloadData = await response.json();
  return payloadData as SensorReading[];
}

type AggregationUpdatedAt = {
  seconds?: number;
  nanos?: number;
};

type AggregationPoint = Record<string, unknown> & {
  timestamp?: number | string;
  bucketStart?: number | string;
  bucketEnd?: number | string;
  bucket?: number | string;
  bucketStartEpoch?: number | string;
  bucketEndEpoch?: number | string;
  time?: number | string;
  epoch?: number | string;
  updatedAt?: AggregationUpdatedAt;
};

function parseTimestamp(rawPoint: AggregationPoint): number {
  const possibleValues = [
    rawPoint.bucketStartEpoch,
    rawPoint.bucketEndEpoch,
    rawPoint.timestamp,
    rawPoint.bucketStart,
    rawPoint.bucketEnd,
    rawPoint.bucket,
    rawPoint.time,
    rawPoint.epoch,
    rawPoint.updatedAt?.seconds,
  ];

  for (const value of possibleValues) {
    const numeric = Number(value);

    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    if (typeof value === "string") {
      const parsedDate = Date.parse(value);
      if (!Number.isNaN(parsedDate)) {
        return Math.floor(parsedDate / 1000);
      }
    }
  }

  return 0;
}

function parseValue(rawPoint: AggregationPoint): number {
  const possibleValues = [rawPoint.value, rawPoint.average, rawPoint.avg, rawPoint.aggregatedValue];

  for (const value of possibleValues) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return Number.NaN;
}

export async function fetchStationAggregatedData(
  stationId: string,
  interval: string,
  indicatorType: string,
): Promise<AggregatedDataPoint[]> {
  const endpoint = new URL(`${SENSOR_API_BASE_URL}/data-management/aggregation/${stationId}/${interval}`);
  endpoint.searchParams.set("indicatorType", indicatorType);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch aggregated data for ${stationId}`);
  }

  const payloadData = await response.json().catch(() => null);

  if (!Array.isArray(payloadData)) {
    return [];
  }

  return payloadData
    .map((point) => {
      const rawPoint = point as AggregationPoint;
      return {
        timestamp: parseTimestamp(rawPoint),
        value: parseValue(rawPoint),
      };
    })
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value) && point.timestamp > 0);
}
