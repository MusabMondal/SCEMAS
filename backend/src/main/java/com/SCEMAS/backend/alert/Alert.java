package com.SCEMAS.backend.alert;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String stationId;
    private String sensorId;

    @Enumerated(EnumType.STRING)
    private Condition condition;

    @Column(name = "reading_value")
    private double value;
    private String severity;
    private String message;
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Alert() {}

    public Alert(String stationId, String sensorId, Condition condition,
                 double value, String severity, String message) {
        this.stationId = stationId;
        this.sensorId = sensorId;
        this.condition = condition;
        this.value = value;
        this.severity = severity;
        this.message = message;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getStationId() { return stationId; }
    public String getSensorId() { return sensorId; }
    public Condition getCondition() { return condition; }
    public double getValue() { return value; }
    public String getSeverity() { return severity; }
    public String getMessage() { return message; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setStatus(String status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
}
