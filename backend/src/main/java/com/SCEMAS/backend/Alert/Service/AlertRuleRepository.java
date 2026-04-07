package com.SCEMAS.backend.Alert.Service;

import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class AlertRuleRepository {

    // Rules stored in memory only — no Firestore reads/writes
    private final Map<String, AlertRule> store = new LinkedHashMap<>();
    private long idCounter = 1;

    public AlertRule save(AlertRule rule) {
        if (rule.getId() == null) {
            rule.setId(String.valueOf(idCounter++));
        }
        store.put(rule.getId(), rule);
        return rule;
    }

    public Optional<AlertRule> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<AlertRule> findAll() {
        return new ArrayList<>(store.values());
    }

    public List<AlertRule> findByCondition(Condition condition) {
        List<AlertRule> result = new ArrayList<>();
        for (AlertRule rule : store.values()) {
            if (condition.equals(rule.getCondition())) result.add(rule);
        }
        return result;
    }

    public long count() {
        return store.size();
    }
}
