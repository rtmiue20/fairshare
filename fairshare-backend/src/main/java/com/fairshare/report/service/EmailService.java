package com.fairshare.report.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        if (mailSender != null) {
            this.mailSender = mailSender;
        } else {
            log.warn("JavaMailSender bean not configured in Spring context. Initializing fallback JavaMailSenderImpl...");
            JavaMailSenderImpl fallback = new JavaMailSenderImpl();
            fallback.setHost("smtp.gmail.com");
            fallback.setPort(587);
            Properties props = fallback.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "false");
            props.put("mail.smtp.starttls.enable", "true");
            this.mailSender = fallback;
        }
    }

    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("FairShare <fairshare.noreply@gmail.com>");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.warn("Could not send email to {}: {}. Logging email content instead.", to, e.getMessage());
            log.info("[SIMULATED EMAIL] To: {} | Subject: {}", to, subject);
        }
    }
}
