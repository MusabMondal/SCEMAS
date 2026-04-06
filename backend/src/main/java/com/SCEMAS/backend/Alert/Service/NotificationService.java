package com.SCEMAS.backend.Alert.Service;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    public void sendNotification(String stationId, String alertMessage) {
        System.out.println("[NOTIFY] Station " + stationId + ": " + alertMessage);
    }

    public void notifyPublic(String stationId, String alertMessage) {
        System.out.println("[NOTIFY - Public] Station " + stationId + ": " + alertMessage);
    }

    public void notifyCityOperator(String stationId, String alertMessage) {
        System.out.println("[NOTIFY - City Operator] Station " + stationId + ": " + alertMessage);
    }

    public void notifyAdministrator(String stationId, String alertMessage) {
        System.out.println("[NOTIFY - Admin] Station " + stationId + ": " + alertMessage);
    }

    public void notifyEmergencyServices(String stationId, String alertMessage) {
        System.out.println("[NOTIFY - Emergency] Station " + stationId + ": " + alertMessage);
    }
}
