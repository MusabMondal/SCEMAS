package com.SCEMAS.backend.Sensor.Service;

import org.springframework.stereotype.Service;
import com.google.cloud.firestore.Firestore;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.SCEMAS.backend.Data_Management.Service.DataManager;


@Service
public class SensorService {

    private final Firestore firestore;
    private final DataManager dataManager;

    public SensorService(Firestore firestore, DataManager dataManager) {
        this.firestore = firestore;
        this.dataManager = dataManager;
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

        // Incremental aggregation cache update (minute bucket),
        // so aggregation endpoints do not need to scan raw readings.
        dataManager.updateAggregationBucket(
            (String) telemetryData.get("stationId"),
            (String) telemetryData.get("indicatorType"),
            telemetryData.get("value"),
            telemetryData.get("timestamp")
        );
        
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

    public List<Map<String, Object>> getLatestReadingsbyStationId(String stationId) {
        // Implementation for fetching latest sensor readings for a station
        // This is just a placeholder and should be implemented to query Firestore
        try{
            ApiFuture<QuerySnapshot> future = firestore.collection("latest_readings")
                .whereEqualTo("stationId", stationId)
                .get();

            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<Map<String,Object>> result = new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                result.add(document.getData());
            }
            return result;

        } catch (Exception e) {
            System.out.println("Error fetching latest sensor readings: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> getAllReadingsbyStationId(String stationId) {
        // Implementation for fetching all sensor readings for a station
        // This is just a placeholder and should be implemented to query Firestore
        try{
            ApiFuture<QuerySnapshot> future = firestore.collection("sensor_readings")
                .whereEqualTo("stationId", stationId)
                .get();

            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<Map<String,Object>> result = new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                result.add(document.getData());
            }
            return result;

        } catch (Exception e) {
            System.out.println("Error fetching all sensor readings: " + e.getMessage());
            return new ArrayList<>();
        }
    }

}
