package com.SCEMAS.backend.alert;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class AlertRuleRepository {

    private final Firestore db;
    private static final String COLLECTION = "alert_rules";

    public AlertRuleRepository(Firestore firestore) {
        this.db = firestore;
    }

    public AlertRule save(AlertRule rule) {
        try {
            if (rule.getId() == null) {
                DocumentReference ref = db.collection(COLLECTION).document();
                rule.setId(ref.getId());
            }
            db.collection(COLLECTION).document(rule.getId()).set(toMap(rule)).get();
            return rule;
        } catch (Exception e) {
            System.err.println("[AlertRuleRepository] Error saving rule: " + e.getMessage());
            return rule;
        }
    }

    public Optional<AlertRule> findById(String id) {
        try {
            DocumentSnapshot doc = db.collection(COLLECTION).document(id).get().get();
            if (doc.exists()) return Optional.of(fromDoc(doc));
            return Optional.empty();
        } catch (Exception e) {
            System.err.println("[AlertRuleRepository] Error finding rule: " + e.getMessage());
            return Optional.empty();
        }
    }

    public List<AlertRule> findAll() {
        try {
            ApiFuture<QuerySnapshot> future = db.collection(COLLECTION).get();
            List<AlertRule> result = new ArrayList<>();
            for (DocumentSnapshot doc : future.get().getDocuments()) {
                result.add(fromDoc(doc));
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AlertRuleRepository] Error fetching rules: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<AlertRule> findByCondition(Condition condition) {
        try {
            ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                    .whereEqualTo("condition", condition.name()).get();
            List<AlertRule> result = new ArrayList<>();
            for (DocumentSnapshot doc : future.get().getDocuments()) {
                result.add(fromDoc(doc));
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AlertRuleRepository] Error fetching rules by condition: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public long count() {
        try {
            return db.collection(COLLECTION).get().get().size();
        } catch (Exception e) {
            return 0;
        }
    }

    private Map<String, Object> toMap(AlertRule rule) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", rule.getId());
        map.put("condition", rule.getCondition() != null ? rule.getCondition().name() : null);
        map.put("operator", rule.getOperator());
        map.put("minThreshold", rule.getMinThreshold());
        map.put("maxThreshold", rule.getMaxThreshold());
        return map;
    }

    private AlertRule fromDoc(DocumentSnapshot doc) {
        AlertRule rule = new AlertRule();
        Map<String, Object> data = doc.getData();
        if (data == null) return rule;

        rule.setId(doc.getId());
        String condStr = (String) data.get("condition");
        if (condStr != null) {
            try { rule.setCondition(Condition.valueOf(condStr)); } catch (Exception ignored) {}
        }
        rule.setOperator((String) data.get("operator"));
        Object min = data.get("minThreshold");
        if (min instanceof Number) rule.setMinThreshold(((Number) min).doubleValue());
        Object max = data.get("maxThreshold");
        if (max instanceof Number) rule.setMaxThreshold(((Number) max).doubleValue());
        return rule;
    }
}
