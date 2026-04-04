package com.SCEMAS.backend.mqtt;

import com.SCEMAS.backend.alert.AlertManager;
import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import org.springframework.stereotype.Service;

@Service
public class TelemetryService {

    private final AlertManager alertManager;

    public TelemetryService(AlertManager alertManager) {
        this.alertManager = alertManager;
    }

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

        // monitorData → check threshold → createAlert if violation
        SensorReadingDto reading = new SensorReadingDto();
        reading.setSensorId(sensorId);
        reading.setIndicatorType(indicatorType);
        reading.setValue(value);
        reading.setUnit(unit);
        alertManager.evaluateSensorReading(stationId, reading);
    }
}
