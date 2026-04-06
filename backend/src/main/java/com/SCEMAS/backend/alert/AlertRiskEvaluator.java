package com.SCEMAS.backend.alert;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import org.springframework.stereotype.Component;

@Component
public class AlertRiskEvaluator implements AlertAlgorithm {

    @Override
    public boolean evaluateReading(SensorReadingDto reading, AlertRule rule) {
        return rule.isViolated(reading.getValue());
    }

    @Override
    public String determineSeverity(SensorReadingDto reading, AlertRule rule) {
        double score = calculateRiskScore(reading, rule);
        return classifySeverity(score);
    }

    @Override
    public String generateAlertMessage(SensorReadingDto reading, AlertRule rule) {
        String impact = evaluateImpact(reading);
        return String.format(
            "ALERT: %s reading of %.2f %s exceeds threshold. Impact: %s",
            reading.getIndicatorType(), reading.getValue(), reading.getUnit(), impact
        );
    }

    public double calculateRiskScore(SensorReadingDto reading, AlertRule rule) {
        double value = reading.getValue();
        double reference;

        if ("GT".equals(rule.getOperator())) {
            reference = rule.getMaxThreshold();
            if (reference == 0) return 0;
            return Math.max(0, (value - reference) / reference * 100);
        } else if ("LT".equals(rule.getOperator())) {
            reference = rule.getMinThreshold();
            if (reference == 0) return 0;
            return Math.max(0, (reference - value) / reference * 100);
        } else {
            // BETWEEN: score based on distance from nearest boundary
            double distFromMax = Math.max(0, value - rule.getMaxThreshold());
            double distFromMin = Math.max(0, rule.getMinThreshold() - value);
            double excess = Math.max(distFromMax, distFromMin);
            double range = rule.getMaxThreshold() - rule.getMinThreshold();
            if (range == 0) return 0;
            return excess / range * 100;
        }
    }

    public String classifySeverity(double score) {
        if (score >= 50) return "HIGH";
        if (score >= 20) return "MEDIUM";
        return "LOW";
    }

    public String evaluateImpact(SensorReadingDto reading) {
        switch (reading.getIndicatorType().toLowerCase()) {
            case "temperature":   return "Risk of heatwave conditions for citizens";
            case "humidity":      return "Risk of discomfort or respiratory issues";
            case "uv_index":      return "Risk of skin damage and UV-related health hazards";
            case "wind_speed":    return "Risk of property damage and dangerous conditions";
            case "precipitation": return "Risk of flooding and hazardous road conditions";
            case "pressure":      return "Risk of severe storm system approaching";
            default:              return "Environmental threshold exceeded";
        }
    }
}
