const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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

export async function getLatestStationReadings(stationId: string): Promise<SensorReading[]> {
  const response = await fetch(`${API_BASE_URL}/api/sensor/${stationId}/latest`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch station ${stationId} latest readings (${response.status})`);
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error("Unexpected latest readings response format");
  }

  return payload as SensorReading[];
}
