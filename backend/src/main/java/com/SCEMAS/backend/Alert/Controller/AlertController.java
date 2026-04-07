package com.SCEMAS.backend.Alert.Controller;

import java.util.List;

import com.SCEMAS.backend.Alert.Service.Alert;
import com.SCEMAS.backend.Alert.Service.AlertManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SCEMAS.backend.Alert.Service.Alert;
import com.SCEMAS.backend.Alert.Service.AlertManager;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AlertController {

    private final AlertManager alertManager;

    public AlertController(AlertManager alertManager) {
        this.alertManager = alertManager;
    }

    // GET /api/alerts/{stationId} — active alerts for a station
    @GetMapping("/alerts/{stationId}")
    public ResponseEntity<List<Alert>> getAlertsForStation(@PathVariable String stationId) {
        return ResponseEntity.ok(alertManager.getAlertsForStation(stationId));
    }

    // GET /api/alerts/{stationId}/all — all alerts (any status) for a station
    @GetMapping("/alerts/{stationId}/all")
    public ResponseEntity<List<Alert>> getAllAlertsForStation(@PathVariable String stationId) {
        return ResponseEntity.ok(alertManager.getAllAlertsForStation(stationId));
    }

    // POST /api/alerts/{stationId}/activate — manually trigger an alert for a station
    @PostMapping("/alerts/{stationId}/activate")
    public ResponseEntity<Alert> activateAlert(@PathVariable String stationId) {
        return ResponseEntity.ok(alertManager.activateAlert(stationId));
    }

    // PATCH /api/alerts/{alertId}/deactivate — resolve an alert by ID
    @PatchMapping("/alerts/{alertId}/deactivate")
    public ResponseEntity<Alert> deactivateAlert(@PathVariable String alertId) {
        return alertManager.updateAlertStatus(alertId, "RESOLVED")
                .<ResponseEntity<Alert>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
