package com.SCEMAS.backend.Alert.Controller;

import com.SCEMAS.backend.Alert.Service.AlertManager;
import com.SCEMAS.backend.Alert.Service.AlertRule;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ThresholdController {

    private final AlertManager alertManager;

    public ThresholdController(AlertManager alertManager) {
        this.alertManager = alertManager;
    }

    // GET /api/thresholds — view all current threshold rules
    @GetMapping("/thresholds")
    public ResponseEntity<List<AlertRule>> getThresholds() {
        return ResponseEntity.ok(alertManager.getAllRules());
    }

    // PUT /api/thresholds/{condition} — update threshold for a condition
    // Body: { "operator": "GT", "minThreshold": 0, "maxThreshold": 30.0 }
    @PutMapping("/thresholds/{condition}")
    public ResponseEntity<AlertRule> updateThreshold(
            @PathVariable String condition,
            @RequestBody Map<String, Object> body) {

        String operator     = (String) body.getOrDefault("operator", "GT");
        double minThreshold = toDouble(body.getOrDefault("minThreshold", 0));
        double maxThreshold = toDouble(body.getOrDefault("maxThreshold", 0));

        return alertManager.updateThreshold(condition, operator, minThreshold, maxThreshold)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    private double toDouble(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        try { return Double.parseDouble(value.toString()); } catch (Exception e) { return 0; }
    }
}
