package com.SCEMAS.backend.alert;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AlertManager {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertRiskEvaluator riskEvaluator;

    public AlertManager(AlertRepository alertRepository,
                        AlertRuleRepository alertRuleRepository,
                        AlertRiskEvaluator riskEvaluator) {
        this.alertRepository = alertRepository;
        this.alertRuleRepository = alertRuleRepository;
        this.riskEvaluator = riskEvaluator;
    }

    // Seed default threshold rules on startup if none exist
    @PostConstruct
    public void seedDefaultRules() {
        if (alertRuleRepository.count() == 0) {
            alertRuleRepository.save(new AlertRule(Condition.TEMPERATURE, "GT", 0, 40.0));
            alertRuleRepository.save(new AlertRule(Condition.HUMIDITY, "GT", 0, 85.0));
            alertRuleRepository.save(new AlertRule(Condition.AIR_QUALITY, "GT", 0, 100.0));
            System.out.println("[AlertManager] Default alert rules seeded.");
        }
    }

    // monitorData → check threshold violation (from state diagram)
    public void evaluateSensorReading(String stationId, SensorReadingDto reading) {
        Condition condition = mapToCondition(reading.getIndicatorType());
        if (condition == null) {
            System.out.println("[AlertManager] Unknown indicator type: " + reading.getIndicatorType());
            return;
        }

        List<AlertRule> rules = alertRuleRepository.findByCondition(condition);
        for (AlertRule rule : rules) {
            if (riskEvaluator.evaluateReading(reading, rule)) {
                // violation occurs → createAlert
                createAlert(stationId, reading, rule);
            }
        }
    }

    // createAlert (from state diagram) — success path: logAlertStatus → notify
    //                                  — failure path: log error
    private void createAlert(String stationId, SensorReadingDto reading, AlertRule rule) {
        try {
            String severity = riskEvaluator.determineSeverity(reading, rule);
            String message = riskEvaluator.generateAlertMessage(reading, rule);

            Alert alert = new Alert(
                stationId,
                reading.getSensorId(),
                mapToCondition(reading.getIndicatorType()),
                reading.getValue(),
                severity,
                message
            );

            // logAlertStatus — store alert in history with ACTIVE status
            Alert saved = alertRepository.save(alert);
            System.out.println("[AlertManager] Alert logged: ID=" + saved.getId()
                + " | " + severity + " | " + message);

            // Notify city operator
            notifyCityOperator(saved);

        } catch (Exception e) {
            // createAlertFailure — display failure message
            System.err.println("[AlertManager] Failed to create alert for sensor "
                + reading.getSensorId() + ": " + e.getMessage());
        }
    }

    // Notify (from state diagram)
    private void notifyCityOperator(Alert alert) {
        System.out.println("[NOTIFY] City Operator — " + alert.getSeverity()
            + " alert on station " + alert.getStationId()
            + ": " + alert.getMessage());
    }

    // updateAlertStatus (from state diagram) — called by AlertController
    public Optional<Alert> updateAlertStatus(Long alertId, String newStatus) {
        Optional<Alert> optional = alertRepository.findById(alertId);
        optional.ifPresent(alert -> {
            alert.setStatus(newStatus);
            alertRepository.save(alert);
        });
        return optional;
    }

    public List<Alert> getAlertHistory() {
        return alertRepository.findAll();
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByStatus("ACTIVE");
    }

    public Optional<Alert> findById(Long id) {
        return alertRepository.findById(id);
    }

    public Alert createManualAlert(String stationId, String sensorId, String message) {
        Alert alert = new Alert(stationId, sensorId, null, 0, "MEDIUM", message);
        Alert saved = alertRepository.save(alert);
        notifyCityOperator(saved);
        return saved;
    }

    public List<AlertRule> getAllRules() {
        return alertRuleRepository.findAll();
    }

    public Optional<AlertRule> updateRule(Long ruleId, double minThreshold, double maxThreshold, String operator) {
        Optional<AlertRule> optional = alertRuleRepository.findById(ruleId);
        optional.ifPresent(rule -> {
            rule.setMinThreshold(minThreshold);
            rule.setMaxThreshold(maxThreshold);
            rule.setOperator(operator);
            alertRuleRepository.save(rule);
        });
        return optional;
    }

    private Condition mapToCondition(String indicatorType) {
        if (indicatorType == null) return null;
        switch (indicatorType.toUpperCase()) {
            case "TEMPERATURE": return Condition.TEMPERATURE;
            case "HUMIDITY": return Condition.HUMIDITY;
            case "AIR_QUALITY": return Condition.AIR_QUALITY;
            default: return null;
        }
    }
}
