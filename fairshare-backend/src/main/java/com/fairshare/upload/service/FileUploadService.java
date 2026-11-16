package com.fairshare.upload.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.upload.dto.FileUploadResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
public class FileUploadService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.service-key:}")
    private String supabaseServiceKey;

    @Value("${app.supabase.bucket:fairshare-uploads}")
    private String supabaseBucket;

    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /**
     * Store uploaded file either in Supabase Storage (when configured) or local filesystem.
     */
    public FileUploadResponse uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn tệp tin hợp lệ để tải lên");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("Kích thước tệp vượt quá giới hạn tối đa (15MB)");
        }

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file_" + System.currentTimeMillis()
        );

        String ext = "";
        int dotIdx = originalFilename.lastIndexOf(".");
        if (dotIdx >= 0) {
            ext = originalFilename.substring(dotIdx).toLowerCase();
        }

        String safeStoredName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : "application/octet-stream";

        String publicUrl = isSupabaseConfigured()
                ? uploadToSupabase(file, safeStoredName, contentType)
                : storeLocally(file, originalFilename, safeStoredName);

        return FileUploadResponse.builder()
                .url(publicUrl)
                .fileName(originalFilename)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .build();
    }

    private boolean isSupabaseConfigured() {
        return StringUtils.hasText(supabaseUrl) && StringUtils.hasText(supabaseServiceKey);
    }

    private String uploadToSupabase(MultipartFile file, String objectName, String contentType) {
        String baseUrl = supabaseUrl.replaceAll("/+$", "");
        String bucket = StringUtils.hasText(supabaseBucket) ? supabaseBucket.trim() : "fairshare-uploads";
        String encodedObject = URLEncoder.encode(objectName, StandardCharsets.UTF_8).replace("+", "%20");
        String uploadEndpoint = baseUrl + "/storage/v1/object/" + bucket + "/" + encodedObject;
        String publicUrl = baseUrl + "/storage/v1/object/public/" + bucket + "/" + encodedObject;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(uploadEndpoint))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", "Bearer " + supabaseServiceKey.trim())
                    .header("apikey", supabaseServiceKey.trim())
                    .header("Content-Type", contentType)
                    .header("x-upsert", "true")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Supabase Storage upload failed ({}): {}", response.statusCode(), response.body());
                throw new BusinessException("Không thể tải tệp lên Supabase Storage (HTTP " + response.statusCode() + ")");
            }

            log.info("File uploaded to Supabase Storage: {} -> {}", file.getOriginalFilename(), publicUrl);
            return publicUrl;
        } catch (BusinessException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Quá trình tải tệp lên Supabase bị gián đoạn");
        } catch (IOException ex) {
            log.error("Failed to upload file {} to Supabase", file.getOriginalFilename(), ex);
            throw new BusinessException("Lỗi kết nối khi tải tệp lên Supabase Storage: " + ex.getMessage());
        }
    }

    private String storeLocally(MultipartFile file, String originalFilename, String safeStoredName) {
        try {
            Path targetDir = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            Path targetFile = targetDir.resolve(safeStoredName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("File uploaded successfully: {} as {}", originalFilename, safeStoredName);
            return "/uploads/" + safeStoredName;
        } catch (IOException e) {
            log.error("Failed to store file {}", originalFilename, e);
            throw new BusinessException("Không thể lưu trữ tệp tin trên máy chủ: " + e.getMessage());
        }
    }
}
