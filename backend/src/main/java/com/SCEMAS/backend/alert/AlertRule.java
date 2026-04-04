package com.SCEMAS.backend.alert;

import jakarta.persistence.*;

@Entity
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Condition condition;

    // operator: "GT" (greater than), "LT" (less than), "BETWEEN"
    private String operator;
    private double minThreshold;
    private double maxThreshold;

    public AlertRule() {}

    public AlertRule(Condition condition, String operator, double minThreshold, double maxThreshold) {
        this.condition = condition;
        this.operator = operator;
        this.minThreshold = minThreshold;
        this.maxThreshold = maxThreshold;
    }

    public Long getId() { return id; }
    public Condition getCondition() { return condition; }
    public String getOperator() { return operator; }
    public double getMinThreshold() { return minThreshold; }
    public double getMaxThreshold() { return maxThreshold; }

    public void setOperator(String operator) { this.operator = operator; }
    public void setMinThreshold(double minThreshold) { this.minThreshold = minThreshold; }
    public void setMaxThreshold(double maxThreshold) { this.maxThreshold = maxThreshold; }

    public boolean isViolated(double value) {
        switch (operator) {
            case "GT": return value > maxThreshold;
            case "LT": return value < minThreshold;
            case "BETWEEN": return value < minThreshold || value > maxThreshold;
            default: return false;
        }
    }
}
