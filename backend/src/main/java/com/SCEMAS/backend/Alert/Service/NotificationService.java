package com.SCEMAS.backend.Alert.Service;

import org.springframework.stereotype.Service;
import com.SCEMAS.backend.Alert.Service.EmailService;

@Service
public class NotificationService {

    private final EmailService emailService;

    public NotificationService(EmailService emailService) {
        this.emailService = emailService;
    }

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
