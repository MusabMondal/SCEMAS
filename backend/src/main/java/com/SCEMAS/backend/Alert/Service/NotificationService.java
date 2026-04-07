package com.SCEMAS.backend.Alert.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final EmailService emailService;
    private final String cityOperatorEmail;

    public NotificationService(EmailService emailService,
                               @Value("${alert.city-operator.email}") String cityOperatorEmail) {
        this.emailService = emailService;
        this.cityOperatorEmail = cityOperatorEmail;
    }

    public void sendNotification(String stationId, String alertMessage) {
        logger.info("[NOTIFY] Station {}: {}", stationId, alertMessage);
    }

    public void notifyPublic(String stationId, String alertMessage) {
        logger.info("[NOTIFY - Public] Station {}: {}", stationId, alertMessage);
    }

    public void notifyCityOperator(String stationId, String alertMessage) {
        logger.info("[NOTIFY - City Operator] Station {}: {}", stationId, alertMessage);

        String subject = "SCEMAS Alert Triggered - Station " + stationId;
        String body = "An alert has been triggered for station " + stationId + ".\n\n"
                + "Details:\n"
                + alertMessage + "\n\n"
                + "Please review and take the necessary action.";

        emailService.sendEmail(List.of(cityOperatorEmail), subject, body);
    }

    public void notifyAdministrator(String stationId, String alertMessage) {
        logger.info("[NOTIFY - Admin] Station {}: {}", stationId, alertMessage);
    }

    public void notifyEmergencyServices(String stationId, String alertMessage) {
        logger.info("[NOTIFY - Emergency] Station {}: {}", stationId, alertMessage);
    }
}
