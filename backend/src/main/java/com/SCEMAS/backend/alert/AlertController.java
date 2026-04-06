package com.SCEMAS.backend.alert;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertManager alertManager;

    public AlertController(AlertManager alertManager) {
        this.alertManager = alertManager;
    }

    // GET /api/alerts — full alert history
    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertManager.getAlertHistory();
    }

    // GET /api/alerts/active — only ACTIVE alerts
    @GetMapping("/active")
    public List<Alert> getActiveAlerts() {
        return alertManager.getActiveAlerts();
    }

    // GET /api/alerts/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Alert> getAlert(@PathVariable String id) {
        return alertManager.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // PATCH /api/alerts/{id}/status — updateAlertStatus (from state diagram)
    // Body: { "status": "ACKNOWLEDGED" } or { "status": "RESOLVED" }
    @PatchMapping("/{id}/status")
    public ResponseEntity<Alert> updateAlertStatus(@PathVariable String id,
                                                   @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null) return ResponseEntity.badRequest().build();
        return alertManager.updateAlertStatus(id, newStatus)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/alerts/rules
    @GetMapping("/rules")
    public List<AlertRule> getAllRules() {
        return alertManager.getAllRules();
    }

    // PUT /api/alerts/rules/{id}
    // Body: { "operator": "GT", "minThreshold": 0, "maxThreshold": 45.0 }
    @PutMapping("/rules/{id}")
    public ResponseEntity<AlertRule> updateRule(@PathVariable String id,
                                                @RequestBody Map<String, Object> body) {
        double min = body.containsKey("minThreshold") ? ((Number) body.get("minThreshold")).doubleValue() : 0;
        double max = body.containsKey("maxThreshold") ? ((Number) body.get("maxThreshold")).doubleValue() : 0;
        String operator = body.containsKey("operator") ? (String) body.get("operator") : "GT";
        return alertManager.updateRule(id, min, max, operator)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/alerts/manual
    // Body: { "stationId": "S01", "sensorId": "sensor-1", "message": "Manual override" }
    @PostMapping("/manual")
    public ResponseEntity<Alert> createManualAlert(@RequestBody Map<String, String> body) {
        String stationId = body.get("stationId");
        String sensorId = body.get("sensorId");
        String message = body.get("message");
        if (stationId == null || sensorId == null || message == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(alertManager.createManualAlert(stationId, sensorId, message));
    }
}
