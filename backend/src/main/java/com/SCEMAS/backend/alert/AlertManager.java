package com.SCEMAS.backend.alert;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AlertManager {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertRiskEvaluator riskEvaluator;
    private final Firestore firestore;

    public AlertManager(AlertRepository alertRepository,
                        AlertRuleRepository alertRuleRepository,
                        AlertRiskEvaluator riskEvaluator,
                        Firestore firestore) {
        this.alertRepository = alertRepository;
        this.alertRuleRepository = alertRuleRepository;
        this.riskEvaluator = riskEvaluator;
        this.firestore = firestore;
    }

    @PostConstruct
    public void init() {
        seedDefaultRules();
        new Thread(this::scanExistingReadings).start();
    }

    // Seed default threshold rules — adds any missing condition rules on startup
    private void seedDefaultRules() {
        seedIfMissing(Condition.TEMPERATURE,   "GT",    0,     35.0);
        seedIfMissing(Condition.HUMIDITY,      "GT",    0,     85.0);
        seedIfMissing(Condition.UV_INDEX,      "GT",    0,      8.0);
        seedIfMissing(Condition.WIND_SPEED,    "GT",    0,     80.0);
        seedIfMissing(Condition.PRECIPITATION, "GT",    0,     25.0);
        seedIfMissing(Condition.PRESSURE,      "LT",  970.0,    0);
    }

    private void seedIfMissing(Condition condition, String operator, double min, double max) {
        if (alertRuleRepository.findByCondition(condition).isEmpty()) {
            alertRuleRepository.save(new AlertRule(condition, operator, min, max));
            System.out.println("[AlertManager] Seeded rule for: " + condition);
        }
    }

    // Read all existing sensor_readings from Firestore and evaluate them
    private void scanExistingReadings() {
        try {
            System.out.println("[AlertManager] Scanning existing sensor_readings...");
            ApiFuture<QuerySnapshot> future = firestore.collection("sensor_readings").get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            for (QueryDocumentSnapshot doc : documents) {
                Map<String, Object> data = doc.getData();

                String stationId   = (String) data.get("stationId");
                String sensorId    = (String) data.get("sensorId");
                String indType     = (String) data.get("indicatorType");
                String unit        = (String) data.get("unit");
                Object valObj      = data.get("value");

                if (stationId == null || sensorId == null || indType == null || valObj == null) continue;

                double value = ((Number) valObj).doubleValue();

                SensorReadingDto reading = new SensorReadingDto();
                reading.setSensorId(sensorId);
                reading.setIndicatorType(indType);
                reading.setValue(value);
                reading.setUnit(unit != null ? unit : "");

                evaluateSensorReading(stationId, reading);
            }

            System.out.println("[AlertManager] Finished scanning " + documents.size() + " readings.");
        } catch (Exception e) {
            System.err.println("[AlertManager] Error scanning sensor_readings: " + e.getMessage());
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
                createAlert(stationId, reading, rule);
            }
        }
    }

    // createAlert — success: logAlertStatus → notify | failure: log error
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

    // Notify (from state diagram)
    private void notifyCityOperator(Alert alert) {
        System.out.println("[NOTIFY] City Operator — " + alert.getSeverity()
            + " alert on station " + alert.getStationId()
            + ": " + alert.getMessage());
    }

    // updateAlertStatus (from state diagram)
    public Optional<Alert> updateAlertStatus(String alertId, String newStatus) {
        Optional<Alert> optional = alertRepository.findById(alertId);
        optional.ifPresent(alert -> {
            alert.setStatus(newStatus);
            alertRepository.save(alert);
        });
        return optional;
    }

    public List<Alert> getAlertHistory()  { return alertRepository.findAll(); }
    public List<Alert> getActiveAlerts()  { return alertRepository.findByStatus("ACTIVE"); }
    public Optional<Alert> findById(String id) { return alertRepository.findById(id); }

    public Alert createManualAlert(String stationId, String sensorId, String message) {
        Alert alert = new Alert(stationId, sensorId, null, 0, "MEDIUM", message);
        Alert saved = alertRepository.save(alert);
        notifyCityOperator(saved);
        return saved;
    }

    public List<AlertRule> getAllRules() { return alertRuleRepository.findAll(); }

    public Optional<AlertRule> updateRule(String ruleId, double minThreshold, double maxThreshold, String operator) {
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
