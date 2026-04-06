package com.SCEMAS.backend.alert.Service;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AlertManager {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertRiskEvaluator riskEvaluator;
    private final NotificationService notificationService;

    // In-memory rule cache — loaded once on startup
    private final Map<Condition, List<AlertRule>> ruleCache = new EnumMap<>(Condition.class);

    public AlertManager(AlertRepository alertRepository,
                        AlertRuleRepository alertRuleRepository,
                        AlertRiskEvaluator riskEvaluator,
                        NotificationService notificationService) {
        this.alertRepository = alertRepository;
        this.alertRuleRepository = alertRuleRepository;
        this.riskEvaluator = riskEvaluator;
        this.notificationService = notificationService;
    }

    @PostConstruct
    public void init() {
        seedDefaultRules();
        loadRuleCache();
    }

    private void loadRuleCache() {
        ruleCache.clear();
        for (AlertRule rule : alertRuleRepository.findAll()) {
            if (rule.getCondition() != null) {
                ruleCache.computeIfAbsent(rule.getCondition(), k -> new ArrayList<>()).add(rule);
            }
        }
        System.out.println("[AlertManager] Rule cache loaded: " + ruleCache.size() + " conditions.");
    }

    private void seedDefaultRules() {
        List<AlertRule> existing = alertRuleRepository.findAll();
        Set<Condition> existingConditions = new HashSet<>();
        for (AlertRule r : existing) {
            if (r.getCondition() != null) existingConditions.add(r.getCondition());
        }
        // Lowered thresholds for testing — simulator ranges overlap these frequently
        seedIfMissing(existingConditions, Condition.TEMPERATURE,   "GT",    0,    20.0);
        seedIfMissing(existingConditions, Condition.HUMIDITY,      "GT",    0,    40.0);
        seedIfMissing(existingConditions, Condition.UV_INDEX,      "GT",    0,     1.0);
        seedIfMissing(existingConditions, Condition.WIND_SPEED,    "GT",    0,     5.0);
        seedIfMissing(existingConditions, Condition.PRECIPITATION, "GT",    0,     1.0);
        seedIfMissing(existingConditions, Condition.PRESSURE,      "LT", 1030.0,   0);
    }

    private void seedIfMissing(Set<Condition> existing, Condition condition,
                                String operator, double min, double max) {
        if (!existing.contains(condition)) {
            alertRuleRepository.save(new AlertRule(condition, operator, min, max));
            System.out.println("[AlertManager] Seeded rule for: " + condition);
        }
    }

    // Called by TelemetryService on every MQTT reading
    public void checkForAlerts(String stationId, String indicatorType, double value) {
        Condition condition = mapToCondition(indicatorType);
        if (condition == null) return;

        List<AlertRule> rules = ruleCache.getOrDefault(condition, Collections.emptyList());
        for (AlertRule rule : rules) {
            SensorReadingDto reading = new SensorReadingDto();
            reading.setSensorId(stationId);
            reading.setIndicatorType(indicatorType);
            reading.setValue(value);
            reading.setUnit("");

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
            System.out.println("[AlertManager] Alert created: ID=" + saved.getId()
                + " | " + severity + " | " + message);

            notificationService.notifyCityOperator(stationId, message);
        } catch (Exception e) {
            System.err.println("[AlertManager] Failed to create alert: " + e.getMessage());
        }
    }

    // GET /alerts/{stationId} — active alerts for a station
    public List<Alert> getAlertsForStation(String stationId) {
        List<Alert> result = new ArrayList<>();
        for (Alert a : alertRepository.findByStatus("ACTIVE")) {
            if (stationId.equals(a.getStationId())) result.add(a);
        }
        return result;
    }

    // GET /alerts/{stationId}/all — all alerts for a station
    public List<Alert> getAllAlertsForStation(String stationId) {
        return alertRepository.findByStationId(stationId);
    }

    // POST /alerts/{stationId}/activate — manually trigger an alert for a station
    public Alert activateAlert(String stationId) {
        Alert alert = new Alert(stationId, stationId, null, 0, "MEDIUM",
            "Manual alert activated for station: " + stationId);
        Alert saved = alertRepository.save(alert);
        notificationService.notifyCityOperator(stationId, saved.getMessage());
        return saved;
    }

    public Optional<Alert> updateAlertStatus(String alertId, String newStatus) {
        Optional<Alert> optional = alertRepository.findById(alertId);
        optional.ifPresent(alert -> {
            alert.setStatus(newStatus);
            alertRepository.save(alert);
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
