package com.SCEMAS.backend.Alert.Service;

import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class EmailService {

    public EmailService() {
        // Initialize email client (e.g., JavaMailSender) here
    }

    public void sendEmailToOperators(List<String> recipients) {
        // Implement email sending logic here
        System.out.println("[EMAIL] To: " + String.join(", ", recipients) + " | Subject: " + subject + " | Body: " + body);
    }

    public void sendEmailToPublic(List<String> recipients) {
        // Implement email sending logic here
        System.out.println("[EMAIL - Public] To: " + String.join(", ", recipients) + " | Subject: " + subject + " | Body: " + body);
    }

    

}
