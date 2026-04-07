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
