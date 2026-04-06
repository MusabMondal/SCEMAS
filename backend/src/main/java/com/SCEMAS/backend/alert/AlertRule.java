package com.SCEMAS.backend.alert;

public class AlertRule {

    private String id;
    private Condition condition;
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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Condition getCondition() { return condition; }
    public String getOperator() { return operator; }
    public double getMinThreshold() { return minThreshold; }
    public double getMaxThreshold() { return maxThreshold; }

    public void setCondition(Condition condition) { this.condition = condition; }
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
