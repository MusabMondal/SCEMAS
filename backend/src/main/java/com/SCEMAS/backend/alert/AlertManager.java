package com.SCEMAS.backend.alert;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AlertManager {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertRiskEvaluator riskEvaluator;

    // In-memory rule cache — loaded once on startup, no repeated reads
    private final Map<Condition, List<AlertRule>> ruleCache = new EnumMap<>(Condition.class);

    public AlertManager(AlertRepository alertRepository,
                        AlertRuleRepository alertRuleRepository,
                        AlertRiskEvaluator riskEvaluator) {
        this.alertRepository = alertRepository;
        this.alertRuleRepository = alertRuleRepository;
        this.riskEvaluator = riskEvaluator;
    }

    @PostConstruct
    public void init() {
        seedDefaultRules();
        loadRuleCache();
    }

    // Load all rules into memory — 1 read on startup
    private void loadRuleCache() {
        ruleCache.clear();
        for (AlertRule rule : alertRuleRepository.findAll()) {
            if (rule.getCondition() != null) {
                ruleCache.computeIfAbsent(rule.getCondition(), k -> new ArrayList<>()).add(rule);
            }
        }
        System.out.println("[AlertManager] Rule cache loaded: " + ruleCache.size() + " conditions.");
    }

    // Seed rules — 1 read total, writes only if a condition is missing
    private void seedDefaultRules() {
        List<AlertRule> existing = alertRuleRepository.findAll();
        Set<Condition> existingConditions = new HashSet<>();
        for (AlertRule r : existing) {
            if (r.getCondition() != null) existingConditions.add(r.getCondition());
        }

        seedIfMissing(existingConditions, Condition.TEMPERATURE,   "GT",    0,    28.0);
        seedIfMissing(existingConditions, Condition.HUMIDITY,      "GT",    0,    80.0);
        seedIfMissing(existingConditions, Condition.UV_INDEX,      "GT",    0,     3.0);
        seedIfMissing(existingConditions, Condition.WIND_SPEED,    "GT",    0,    50.0);
        seedIfMissing(existingConditions, Condition.PRECIPITATION, "GT",    0,    10.0);
        seedIfMissing(existingConditions, Condition.PRESSURE,      "LT",  970.0,   0);
    }

    private void seedIfMissing(Set<Condition> existing, Condition condition,
                                String operator, double min, double max) {
        if (!existing.contains(condition)) {
            alertRuleRepository.save(new AlertRule(condition, operator, min, max));
            System.out.println("[AlertManager] Seeded rule for: " + condition);
        }
    }

    // Entry point from TelemetryService (MQTT pipeline)
    public void evaluateSensorReading(String stationId, SensorReadingDto reading) {
        Condition condition = mapToCondition(reading.getIndicatorType());
        if (condition == null) return;

        List<AlertRule> rules = ruleCache.getOrDefault(condition, Collections.emptyList());
        for (AlertRule rule : rules) {
            if (riskEvaluator.evaluateReading(reading, rule)) {
                createAlert(stationId, reading, rule);
            }
        }
    }

    private void createAlert(String stationId, SensorReadingDto reading, AlertRule rule) {
        try {
            String severity = riskEvaluator.determineSeverity(reading, rule);
            String message  = riskEvaluator.generateAlertMessage(reading, rule);

            Alert alert = new Alert(
                stationId,
                reading.getSensorId(),
                mapToCondition(reading.getIndicatorType()),
                reading.getValue(),
                severity,
                message
            );

            Alert saved = alertRepository.save(alert);
            System.out.println("[AlertManager] Alert logged: ID=" + saved.getId()
                + " | " + severity + " | " + message);

            notifyCityOperator(saved);
        } catch (Exception e) {
            System.err.println("[AlertManager] Failed to create alert for sensor "
                + reading.getSensorId() + ": " + e.getMessage());
        }
    }

    private void notifyCityOperator(Alert alert) {
        System.out.println("[NOTIFY] City Operator — " + alert.getSeverity()
            + " alert on station " + alert.getStationId()
            + ": " + alert.getMessage());
    }

    public Optional<Alert> updateAlertStatus(String alertId, String newStatus) {
        Optional<Alert> optional = alertRepository.findById(alertId);
        optional.ifPresent(alert -> {
            alert.setStatus(newStatus);
            alertRepository.save(alert);
        });
        return optional;
    }

    public List<Alert> getAlertHistory()       { return alertRepository.findAll(); }
    public List<Alert> getActiveAlerts()       { return alertRepository.findByStatus("ACTIVE"); }
    public Optional<Alert> findById(String id) { return alertRepository.findById(id); }

    public Alert createManualAlert(String stationId, String sensorId, String message) {
        Alert alert = new Alert(stationId, sensorId, null, 0, "MEDIUM", message);
        Alert saved = alertRepository.save(alert);
        notifyCityOperator(saved);
        return saved;
    }

    public List<AlertRule> getAllRules() { return alertRuleRepository.findAll(); }

    public Optional<AlertRule> updateRule(String ruleId, double minThreshold,
                                          double maxThreshold, String operator) {
        Optional<AlertRule> optional = alertRuleRepository.findById(ruleId);
        optional.ifPresent(rule -> {
            rule.setMinThreshold(minThreshold);
            rule.setMaxThreshold(maxThreshold);
            rule.setOperator(operator);
            alertRuleRepository.save(rule);
            loadRuleCache();
        });
        return optional;
    }

    private Condition mapToCondition(String indicatorType) {
        if (indicatorType == null) return null;
        switch (indicatorType.toLowerCase()) {
            case "temperature":   return Condition.TEMPERATURE;
            case "humidity":      return Condition.HUMIDITY;
            case "uv_index":      return Condition.UV_INDEX;
            case "wind_speed":    return Condition.WIND_SPEED;
            case "precipitation": return Condition.PRECIPITATION;
            case "pressure":      return Condition.PRESSURE;
            default: return null;
        }
    }
}
