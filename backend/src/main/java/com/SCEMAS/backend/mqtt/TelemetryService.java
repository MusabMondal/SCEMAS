package com.SCEMAS.backend.mqtt;

import org.springframework.stereotype.Service;

@Service
public class TelemetryService {

    public void processReading(
            String stationId,
            String sensorId,
            String indicatorType,
            double value,
            String unit,
            String timestamp
    ) {
        System.out.println("Processing telemetry...");
        System.out.println("Station ID: " + stationId);
        System.out.println("Sensor ID: " + sensorId);
        System.out.println("Indicator Type: " + indicatorType);
        System.out.println("Value: " + value);
        System.out.println("Unit: " + unit);
        System.out.println("Timestamp: " + timestamp);
        System.out.println("-----------------------------");

        // Later:
        // 1. save to database
        // 2. check threshold for indicatorType
        // 3. create alert if threshold exceeded
        // 4. notify frontend with websocket
    }
}
