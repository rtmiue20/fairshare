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
    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
    private static final String AVATAR_SUBDIR = "avatars";
    private static final java.util.Set<String> AVATAR_EXTENSIONS = java.util.Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /** Lưu ảnh đại diện vào Supabase Storage (nếu đã cấu hình) hoặc uploads/avatars và trả về URL công khai. */
    public FileUploadResponse uploadAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn ảnh đại diện hợp lệ");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new BusinessException("Ảnh đại diện không được vượt quá 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).startsWith("image/")) {
            throw new BusinessException("Tệp tải lên phải là hình ảnh (PNG, JPG, WEBP, GIF)");
        }
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar");
        String ext = extractExtension(originalFilename);
        if (ext.isEmpty()) {
            ext = extensionFromImageContentType(contentType);
        }
        if (!AVATAR_EXTENSIONS.contains(ext)) {
            throw new BusinessException("Định dạng ảnh không được hỗ trợ (chỉ PNG, JPG, WEBP, GIF)");
        }
        String storedName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        String publicUrl = isSupabaseConfigured()
                ? uploadToSupabase(file, AVATAR_SUBDIR + "/" + storedName, contentType)
                : storeLocally(file, Paths.get(uploadDir, AVATAR_SUBDIR), "/uploads/" + AVATAR_SUBDIR + "/" + storedName, storedName, "Không thể lưu ảnh đại diện");

        return FileUploadResponse.builder()
                .url(publicUrl)
                .fileName(originalFilename)
                .fileSize(file.getSize())
                .contentType(contentType)
                .build();
    }

    /** Xóa file ảnh đại diện cũ (trong uploads/avatars hoặc Supabase Storage). */
    public void deleteAvatar(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return;
        }
        String localPrefix = "/uploads/" + AVATAR_SUBDIR + "/";
        if (publicUrl.startsWith(localPrefix)) {
            try {
                Path dir = Paths.get(uploadDir, AVATAR_SUBDIR).toAbsolutePath().normalize();
                Path file = dir.resolve(publicUrl.substring(localPrefix.length())).normalize();
                if (file.startsWith(dir)) {
                    Files.deleteIfExists(file);
                }
            } catch (IOException e) {
                log.warn("Could not delete old avatar {}", publicUrl, e);
            }
            return;
        }
        if (isSupabaseConfigured()) {
            String remotePrefix = getSupabasePublicPrefix();
            if (publicUrl.startsWith(remotePrefix)) {
                deleteFromSupabase(publicUrl.substring(remotePrefix.length()));
            }
        }
    }

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
        String ext = extractExtension(originalFilename);
        String safeStoredName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : "application/octet-stream";

        String publicUrl = isSupabaseConfigured()
                ? uploadToSupabase(file, safeStoredName, contentType)
                : storeLocally(file, Paths.get(uploadDir), "/uploads/" + safeStoredName, safeStoredName, "Không thể lưu trữ tệp tin trên máy chủ");

        return FileUploadResponse.builder()
                .url(publicUrl)
                .fileName(originalFilename)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .build();
    }

    private String extractExtension(String filename) {
        int dotIdx = filename.lastIndexOf('.');
        return dotIdx >= 0 ? filename.substring(dotIdx).toLowerCase() : "";
    }

    private String extensionFromImageContentType(String contentType) {
        String normalized = contentType.toLowerCase(java.util.Locale.ROOT).split(";")[0].trim();
        return switch (normalized) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    private boolean isSupabaseConfigured() {
        return StringUtils.hasText(supabaseUrl) && StringUtils.hasText(supabaseServiceKey);
    }

    private String getSupabaseBaseUrl() {
        return supabaseUrl.replaceAll("/+$", "");
    }

    private String getSupabaseBucketName() {
        return StringUtils.hasText(supabaseBucket) ? supabaseBucket.trim() : "fairshare-uploads";
    }

    private String getSupabasePublicPrefix() {
        return getSupabaseBaseUrl() + "/storage/v1/object/public/" + getSupabaseBucketName() + "/";
    }

    private String encodeObjectPath(String objectPath) {
        String[] segments = objectPath.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) {
                encoded.append('/');
            }
            encoded.append(URLEncoder.encode(segments[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return encoded.toString();
    }

    private String uploadToSupabase(MultipartFile file, String objectPath, String contentType) {
        String baseUrl = getSupabaseBaseUrl();
        String bucket = getSupabaseBucketName();
        String encodedObject = encodeObjectPath(objectPath);
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

    private void deleteFromSupabase(String objectPath) {
        String endpoint = getSupabaseBaseUrl() + "/storage/v1/object/" + getSupabaseBucketName() + "/" + encodeObjectPath(objectPath);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + supabaseServiceKey.trim())
                    .header("apikey", supabaseServiceKey.trim())
                    .DELETE()
                    .build();
            httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (IOException ex) {
            log.warn("Could not delete old Supabase object {}", objectPath, ex);
        }
    }

    private String storeLocally(MultipartFile file, Path baseDir, String publicUrl, String storedName, String errorPrefix) {
        try {
            Path targetDir = baseDir.toAbsolutePath().normalize();
            Files.createDirectories(targetDir);
            Path targetFile = targetDir.resolve(storedName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("File uploaded successfully: {} as {}", file.getOriginalFilename(), publicUrl);
            return publicUrl;
        } catch (IOException e) {
            log.error("Failed to store file {}", file.getOriginalFilename(), e);
            throw new BusinessException(errorPrefix + ": " + e.getMessage());
        }
    }
}
