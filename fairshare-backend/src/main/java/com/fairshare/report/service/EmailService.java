package com.fairshare.report.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

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

    public boolean isSmtpConfigured() {
        return mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank();
    }

    public String getSenderEmail() {
        return mailUsername != null && !mailUsername.isBlank() ? mailUsername : "";
    }

    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Thành viên chưa có địa chỉ email hợp lệ.");
        }
        if (!isSmtpConfigured()) {
            log.warn("SMTP_NOT_CONFIGURED: Cannot send real email to {} (missing spring.mail.username/password).", to);
            throw new IllegalStateException(
                    "SMTP_NOT_CONFIGURED: Chưa cấu hình MAIL_USERNAME / MAIL_PASSWORD trên máy chủ để gửi email tự động.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String fromAddress = (mailUsername != null && !mailUsername.isBlank())
                    ? mailUsername.trim()
                    : "fairshare.noreply@gmail.com";
            helper.setFrom("FairShare <" + fromAddress + ">");
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send SMTP email to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Gửi email SMTP thất bại: " + e.getMessage(), e);
        }
    }
}
