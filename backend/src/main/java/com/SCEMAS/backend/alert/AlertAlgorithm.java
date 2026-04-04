package com.SCEMAS.backend.alert;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;

public interface AlertAlgorithm {
    boolean evaluateReading(SensorReadingDto reading, AlertRule rule);
    String determineSeverity(SensorReadingDto reading, AlertRule rule);
    String generateAlertMessage(SensorReadingDto reading, AlertRule rule);
}
