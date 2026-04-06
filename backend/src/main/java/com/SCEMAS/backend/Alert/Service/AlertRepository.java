package com.SCEMAS.backend.Alert.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

@Repository
public class AlertRepository {

    private final Firestore db;
    private static final String COLLECTION = "alerts";

    // All reads come from this in-memory list — zero Firestore reads
    private final List<Alert> memoryStore = new ArrayList<>();

    public AlertRepository(Firestore firestore) {
        this.db = firestore;
    }

    public Alert save(Alert alert) {
        try {
            if (alert.getId() == null) {
                DocumentReference ref = db.collection(COLLECTION).document();
                alert.setId(ref.getId());
            }
            // Write to Firestore — .get() blocks until complete so errors surface immediately
            db.collection(COLLECTION).document(alert.getId()).set(toMap(alert)).get();
            System.out.println("[AlertRepository] Saved alert to Firestore: " + alert.getId());
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error writing alert to Firestore: " + e.getMessage());
        }
        // Always keep in memory
        memoryStore.removeIf(a -> alert.getId().equals(a.getId()));
        memoryStore.add(alert);
        return alert;
    }

    public Optional<Alert> findById(String id) {
        return memoryStore.stream().filter(a -> id.equals(a.getId())).findFirst();
    }

    public List<Alert> findAll() {
        return new ArrayList<>(memoryStore);
    }

    public List<Alert> findByStatus(String status) {
        return memoryStore.stream()
                .filter(a -> status.equals(a.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Alert> findByStationId(String stationId) {
        return memoryStore.stream()
                .filter(a -> stationId.equals(a.getStationId()))
                .collect(Collectors.toList());
    }

    public List<Alert> findBySensorId(String sensorId) {
        return memoryStore.stream()
                .filter(a -> sensorId.equals(a.getSensorId()))
                .collect(Collectors.toList());
    }

    private Map<String, Object> toMap(Alert alert) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", alert.getId());
        map.put("stationId", alert.getStationId());
        map.put("sensorId", alert.getSensorId());
        map.put("condition", alert.getCondition() != null ? alert.getCondition().name() : null);
        map.put("value", alert.getValue());
        map.put("severity", alert.getSeverity());
        map.put("message", alert.getMessage());
        map.put("status", alert.getStatus());
        map.put("createdAt", alert.getCreatedAt() != null ? alert.getCreatedAt().toString() : null);
        map.put("updatedAt", alert.getUpdatedAt() != null ? alert.getUpdatedAt().toString() : null);
        return map;
    }
}
