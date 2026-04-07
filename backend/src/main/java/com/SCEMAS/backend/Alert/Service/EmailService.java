package com.SCEMAS.backend.Alert.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public EmailService(JavaMailSender mailSender,
                        @Value("${alert.email.from:no-reply@scemas.local}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendEmail(List<String> recipients, String subject, String body) {
        if (recipients == null || recipients.isEmpty()) {
            logger.warn("[EMAIL] No recipients configured, skipping email dispatch. Subject={}", subject);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipients.toArray(String[]::new));
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            logger.info("[EMAIL] Sent alert email to {} recipient(s).", recipients.size());
        } catch (MailException ex) {
            logger.error("[EMAIL] Failed to send alert email: {}", ex.getMessage(), ex);
        }
    }
}
