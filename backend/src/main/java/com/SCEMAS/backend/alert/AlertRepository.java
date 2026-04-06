package com.SCEMAS.backend.alert;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class AlertRepository {

    private final Firestore db;
    private static final String COLLECTION = "alerts";

    public AlertRepository(Firestore firestore) {
        this.db = firestore;
    }

    public Alert save(Alert alert) {
        try {
            if (alert.getId() == null) {
                DocumentReference ref = db.collection(COLLECTION).document();
                alert.setId(ref.getId());
            }
            db.collection(COLLECTION).document(alert.getId()).set(toMap(alert)).get();
            return alert;
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error saving alert: " + e.getMessage());
            return alert;
        }
    }

    public Optional<Alert> findById(String id) {
        try {
            DocumentSnapshot doc = db.collection(COLLECTION).document(id).get().get();
            if (doc.exists()) return Optional.of(fromDoc(doc));
            return Optional.empty();
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error finding alert: " + e.getMessage());
            return Optional.empty();
        }
    }

    public List<Alert> findAll() {
        try {
            ApiFuture<QuerySnapshot> future = db.collection(COLLECTION).get();
            List<Alert> result = new ArrayList<>();
            for (DocumentSnapshot doc : future.get().getDocuments()) {
                result.add(fromDoc(doc));
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error fetching alerts: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<Alert> findByStatus(String status) {
        try {
            ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                    .whereEqualTo("status", status).get();
            List<Alert> result = new ArrayList<>();
            for (DocumentSnapshot doc : future.get().getDocuments()) {
                result.add(fromDoc(doc));
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error fetching alerts by status: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<Alert> findBySensorId(String sensorId) {
        try {
            ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                    .whereEqualTo("sensorId", sensorId).get();
            List<Alert> result = new ArrayList<>();
            for (DocumentSnapshot doc : future.get().getDocuments()) {
                result.add(fromDoc(doc));
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AlertRepository] Error fetching alerts by sensorId: " + e.getMessage());
            return new ArrayList<>();
        }
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

    private Alert fromDoc(DocumentSnapshot doc) {
        Alert alert = new Alert();
        Map<String, Object> data = doc.getData();
        if (data == null) return alert;

        alert.setId(doc.getId());
        alert.setStationId((String) data.get("stationId"));
        alert.setSensorId((String) data.get("sensorId"));
        String condStr = (String) data.get("condition");
        if (condStr != null) {
            try { alert.setCondition(Condition.valueOf(condStr)); } catch (Exception ignored) {}
        }
        Object val = data.get("value");
        if (val instanceof Number) alert.setValue(((Number) val).doubleValue());
        alert.setSeverity((String) data.get("severity"));
        alert.setMessage((String) data.get("message"));
        alert.setStatusDirect((String) data.get("status"));
        String createdAt = (String) data.get("createdAt");
        if (createdAt != null) try { alert.setCreatedAt(LocalDateTime.parse(createdAt)); } catch (Exception ignored) {}
        String updatedAt = (String) data.get("updatedAt");
        if (updatedAt != null) try { alert.setUpdatedAt(LocalDateTime.parse(updatedAt)); } catch (Exception ignored) {}
        return alert;
    }
}
