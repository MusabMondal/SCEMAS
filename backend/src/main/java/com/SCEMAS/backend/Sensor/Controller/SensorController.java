package com.SCEMAS.backend.Sensor.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

// Public API
@RestController
public class SensorController {

    @GetMapping("/sensor/{stationId}")
    public String getSensorData(@PathVariable String stationId) {
        // Implementation for fetching sensor data for the given station ID
        return "Sensor data for station: " + stationId;
    }

    @GetMapping("/sensor/{stationId}/all")
    public String getAllSensorData(@PathVariable String stationId) {
        // Implementation for fetching all sensor data for the given station ID
        return "All sensor data for station: " + stationId;
    }
}
