package com.SCEMAS.backend.Alert.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AlertController {

    @GetMapping("/alerts/{stationId}")
    public String getAlertsForStation(@PathVariable String stationId) {
        // Implementation for fetching alerts for the given station ID
        return "Alerts for station: " + stationId; 
    }

    @GetMapping("/alerts/{stationId}/all")
    public String getAllAlertsForStation(@PathVariable String stationId) {
        // Implementation for fetching all alerts for the given station ID
        return "All alerts for station: " + stationId;
    }

    @PostMapping("/alerts/{stationId}/activate")
    public String activateAlert(@PathVariable String stationId) {
        // Implementation for activating an alert for the given station ID
        return "Alert activated for station: " + stationId;
    }

}
