package com.SCEMAS.backend.Sensor.Service;

import org.springframework.stereotype.Service;
import com.google.cloud.firestore.Firestore;
import java.util.HashMap;
import java.util.Map;


@Service
public class SensorService {

    private final Firestore firestore;

    public SensorService(Firestore firestore) {
        this.firestore = firestore;
    }

    public void saveReadings(Map<String, Object> telemetryData) {
        // Implementation for saving sensor readings

        try{
        /*
        =====================================================
        1. SAVE FULL HISTORY (sensor_readings)
        =====================================================
        */
        firestore.collection("sensor_readings")
            .add(telemetryData);
        
        /*
        =====================================================
        2. SAVE / UPDATE LATEST READING (latest_readings)
        =====================================================
        */
        String latestDocId = telemetryData.get("stationId") + "_" + telemetryData.get("indicatorType");

        firestore.collection("latest_readings")
            .document(latestDocId)
            .set(telemetryData);
        
        /*
        =====================================================
        3. UPDATE STATION (heartbeat + location)
        =====================================================
        */
        Map<String, Object> stationData = new HashMap<>();
        stationData.put("stationId", telemetryData.get("stationId"));
        stationData.put("latitude", telemetryData.get("latitude"));
        stationData.put("longitude", telemetryData.get("longitude"));
        stationData.put("timestamp", telemetryData.get("timestamp"));
        
        firestore.collection("stations")
            .document((String) telemetryData.get("stationId"))
            .set(stationData);

        System.out.println("Sensor readings saved successfully.");

        } catch (Exception e) {
            System.out.println("Error saving sensor readings: " + e.getMessage());
        }
    }

}
