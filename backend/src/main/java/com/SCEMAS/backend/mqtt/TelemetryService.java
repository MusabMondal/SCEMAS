package com.SCEMAS.backend.mqtt;

import org.springframework.stereotype.Service;

import com.SCEMAS.backend.Sensor.Service.SensorService;
import com.SCEMAS.backend.Data_Management.Service.DataManager;

import java.util.Map;
import java.util.HashMap;

@Service
public class TelemetryService {

    private final SensorService sensorService;
    private final DataManager dataManager;

    public TelemetryService(SensorService sensorService, DataManager dataManager) {
        this.sensorService = sensorService;
        this.dataManager = dataManager;
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
        Map<String, Object> telemetryData = new HashMap<>();
        telemetryData.put("stationId", stationId);
        telemetryData.put("sensorId", sensorId);
        telemetryData.put("longitude", longitude);
        telemetryData.put("latitude", latitude);
        telemetryData.put("indicatorType", indicatorType);
        telemetryData.put("value", value);
        telemetryData.put("unit", unit);
        telemetryData.put("timestamp", timestamp);

        // 1. Save raw reading
        sensorService.saveReadings(telemetryData);

        // 2. Update 5-minute aggregate immediately
        dataManager.updateFiveMinuteAggregation(
                stationId,
                indicatorType,
                value,
                timestamp
        );

        // 3. Later: threshold checks / alerts / websocket
    }
}