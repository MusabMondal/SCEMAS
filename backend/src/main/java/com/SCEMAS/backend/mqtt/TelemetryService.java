package com.SCEMAS.backend.mqtt;

import org.springframework.stereotype.Service;
import com.SCEMAS.backend.Sensor.Service.SensorService;
import java.util.Map;
import java.util.HashMap;

@Service
public class TelemetryService {

    private final SensorService sensorService;

    public TelemetryService(SensorService sensorService) {
        this.sensorService = sensorService;
    }

    public void processReading(
            String stationId,
            String sensorId,
            double longitude,
            double latitude,
            String indicatorType,
            double value,
            String unit,
            String timestamp
    ) {
        System.out.println("Processing telemetry...");
        System.out.println("Station ID: " + stationId);
        System.out.println("Sensor ID: " + sensorId);
        System.out.println("Longitude: " + longitude);
        System.out.println("Latitude: " + latitude);
        System.out.println("Indicator Type: " + indicatorType);
        System.out.println("Value: " + value);
        System.out.println("Unit: " + unit);
        System.out.println("Timestamp: " + timestamp);
        System.out.println("-----------------------------");

        Map<String, Object> telemetryData = new HashMap<>();
        telemetryData.put("stationId", stationId);
        telemetryData.put("sensorId", sensorId);
        telemetryData.put("longitude", longitude);
        telemetryData.put("latitude", latitude);
        telemetryData.put("indicatorType", indicatorType);
        telemetryData.put("value", value);
        telemetryData.put("unit", unit);
        telemetryData.put("timestamp", timestamp);

        // Later:
        // 1. save to database
        sensorService.saveReadings(telemetryData);

        // 2. check threshold for indicatorType
        // 3. create alert if threshold exceeded
        // 4. notify frontend with websocket
    }
}
