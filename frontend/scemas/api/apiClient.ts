

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
}

export type Alert = {
    id: string;
    stationId: string;
    sensorId: string;
    condition: string | null;
    value: number;
    severity: string;
    message: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export async function fetchLatestStationReadings(stationId: string) : Promise<SensorReading[]>{
    const response = await fetch(
        `${API_BASE_URL}/sensor/${stationId}/latest`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        }
    )

    if (!response.ok) {
        throw new Error("Failed to fetch latest station readings");
    }

    const payload_data = await response.json();

    return payload_data as SensorReading[];
}

export async function fetchActiveAlerts(stationId: string): Promise<Alert[]> {
    const response = await fetch(
        `${API_BASE_URL}/alerts/${stationId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch active alerts");
    }

    const payloadData = await response.json();

    return payloadData as Alert[];
}
