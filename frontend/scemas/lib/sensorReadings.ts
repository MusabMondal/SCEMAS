import type { SensorReading } from "@/api/apiClient";

export const DISPLAY_ORDER = [
  "temperature",
  "humidity",
  "pressure",
  "precipitation",
  "uv_index",
  "wind_speed",
] as const;

export const INDICATOR_LABELS: Record<string, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  pressure: "Pressure",
  precipitation: "Precipitation",
  uv_index: "UV Index",
  wind_speed: "Wind Speed",
};

export function upsertLatestByIndicator(
  previous: Record<string, SensorReading>,
  readings: SensorReading[],
): Record<string, SensorReading> {
  const next = { ...previous };

  for (const reading of readings) {
    const prevReading = next[reading.indicatorType];

    if (!prevReading || Number(reading.timestamp) >= Number(prevReading.timestamp)) {
      next[reading.indicatorType] = reading;
    }
  }

  return next;
}

export function sortReadingsForDisplay(readingsByType: Record<string, SensorReading>): SensorReading[] {
  const ordered = DISPLAY_ORDER
    .map((indicatorType) => readingsByType[indicatorType])
    .filter((reading): reading is SensorReading => Boolean(reading));

  const unordered = Object.values(readingsByType).filter(
    (reading) => !DISPLAY_ORDER.includes(reading.indicatorType as (typeof DISPLAY_ORDER)[number]),
  );

  return [...ordered, ...unordered];
}

export function getLatestReading(readingsByType: Record<string, SensorReading>): SensorReading | null {
  return Object.values(readingsByType).reduce<SensorReading | null>((latest, current) => {
    if (!latest) {
      return current;
    }

    return Number(current.timestamp) > Number(latest.timestamp) ? current : latest;
  }, null);
}
