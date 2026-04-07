const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080/api";

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

export type AggregatedReading = {
  stationId: string;
  indicatorType: string;
  bucketStartEpoch: number;
  bucketEndEpoch: number;
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
};

export async function fetchLatestStationReadings(stationId: string): Promise<SensorReading[]> {
  const response = await fetch(`${API_BASE_URL}/sensor/${stationId}/latest`, {
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

export async function fetchAggregated5MinuteData(
  stationId: string,
  indicatorType: string,
): Promise<AggregatedReading[]> {
  const response = await fetch(
    `${API_BASE_URL}/data-management/aggregation/${stationId}/5mins?indicatorType=${encodeURIComponent(indicatorType)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch 5-minute aggregates for ${stationId} (${indicatorType}) [${response.status} ${response.statusText}]`,
    );
  }

  const payloadData = await response.json();

  return payloadData as AggregatedReading[];
}
