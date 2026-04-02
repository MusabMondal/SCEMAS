package com.SCEMAS.backend.mqtt;

import com.SCEMAS.backend.mqtt.dto.SensorReadingDto;
import com.SCEMAS.backend.mqtt.dto.StationBatchDto;
import com.SCEMAS.backend.mqtt.dto.StationDataDto;
import com.SCEMAS.backend.mqtt.TelemetryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

@Component
public class MqttListener {

    private final ObjectMapper objectMapper;
    private final TelemetryService telemetryService;

    public MqttListener(TelemetryService telemetryService) {
        this.objectMapper = new ObjectMapper();
        this.telemetryService = telemetryService;
    }


    public void handleMessage(Message<?> message) {
        try {
            String payload = message.getPayload().toString();
            String topic = message.getHeaders().get("mqtt_receivedTopic").toString();

            System.out.println("--------------------------------------------------------");
            System.out.println("Topic: " + topic);
            System.out.println("Payload: " + payload);
            System.out.println("--------------------------------------------------------");

            StationBatchDto batchDto = objectMapper.readValue(payload, StationBatchDto.class);

            if (batchDto.getStations() == null || batchDto.getStations().isEmpty()) {
                System.out.println("No stations found in MQTT message.");
                return;
            }

            for (StationDataDto station : batchDto.getStations()) {
                System.out.println("Processing station: " + station.getStationId());

                if (station.getSensorReading() == null || station.getSensorReading().isEmpty()) {
                    System.out.println("No readings found for station: " + station.getStationId());
                    continue;
                }

                for (SensorReadingDto reading : station.getSensorReading()) {
                    System.out.println("  Sensor ID: " + reading.getSensorId());
                    System.out.println("  Indicator: " + reading.getIndicatorType());
                    System.out.println("  Value: " + reading.getValue() + " " + reading.getUnit());

                    telemetryService.processReading(
                            station.getStationId(),
                            reading.getSensorId(),
                            reading.getIndicatorType(),
                            reading.getValue(),
                            reading.getUnit(),
                            String.valueOf(batchDto.getTimestamp())
                    );
                }
            }

        } catch (Exception e) {
            System.err.println("Error processing MQTT message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}