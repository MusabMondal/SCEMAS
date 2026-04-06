package com.SCEMAS.backend.mqtt;

import com.SCEMAS.backend.Alert.Service.AlertManager;
import com.SCEMAS.backend.Sensor.Service.SensorService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class TelemetryService {

    private final AlertManager alertManager;
    private final SensorService sensorService;

    public TelemetryService(AlertManager alertManager, SensorService sensorService) {
        this.alertManager = alertManager;
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
        System.out.println("Indicator Type: " + indicatorType);
        System.out.println("Value: " + value);
        System.out.println("Unit: " + unit);
        System.out.println("Timestamp: " + timestamp);
        System.out.println("-----------------------------");

        // Save reading to Firestore (SensorController branch)
        Map<String, Object> telemetryData = new HashMap<>();
        telemetryData.put("stationId", stationId);
        telemetryData.put("sensorId", sensorId);
        telemetryData.put("longitude", longitude);
        telemetryData.put("latitude", latitude);
        telemetryData.put("indicatorType", indicatorType);
        telemetryData.put("value", value);
        telemetryData.put("unit", unit);
        telemetryData.put("timestamp", timestamp);
        sensorService.saveReadings(telemetryData);

        // Check thresholds and create alert if violated (alert-controller branch)
        alertManager.checkForAlerts(stationId, indicatorType, value);
    }
}
