package com.SCEMAS.backend.Sensor.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import com.SCEMAS.backend.Sensor.Service.SensorService;
import java.util.List;
import java.util.Map;

// Public API
@RestController
@RequestMapping("api/")
public class SensorController {

    private final SensorService sensorService;

    public SensorController(SensorService sensorService) {
        this.sensorService = sensorService;
    }

    @GetMapping("/sensor/{stationId}/latest")
    public List<Map<String, Object>> getSensorData(@PathVariable String stationId) {
        // Implementation for fetching sensor data for the given station ID

        return sensorService.getLatestReadingsbyStationId(stationId);
    }

    @GetMapping("/sensor/{stationId}/all")
    public List<Map<String, Object>> getAllSensorData(@PathVariable String stationId) {
        // Implementation for fetching all sensor data for the given station ID
        return sensorService.getAllReadingsbyStationId(stationId);
    }
}