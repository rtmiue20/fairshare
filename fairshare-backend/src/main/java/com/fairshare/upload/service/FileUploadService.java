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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Slf4j
@Service
public class FileUploadService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
    private static final String AVATAR_SUBDIR = "avatars";
    private static final java.util.Set<String> AVATAR_EXTENSIONS = java.util.Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");

    /** Lưu ảnh đại diện vào uploads/avatars và trả về URL công khai /uploads/avatars/xxx */
    public FileUploadResponse uploadAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn ảnh đại diện hợp lệ");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new BusinessException("Ảnh đại diện không được vượt quá 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new BusinessException("Tệp tải lên phải là hình ảnh (PNG, JPG, WEBP, GIF)");
        }
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar");
        String ext = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = originalFilename.substring(dotIdx).toLowerCase();
        }
        if (!AVATAR_EXTENSIONS.contains(ext)) {
            throw new BusinessException("Định dạng ảnh không được hỗ trợ (chỉ PNG, JPG, WEBP, GIF)");
        }
        String storedName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        try {
            Path targetDir = Paths.get(uploadDir, AVATAR_SUBDIR).toAbsolutePath().normalize();
            Files.createDirectories(targetDir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, targetDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            }
            return FileUploadResponse.builder()
                    .url("/uploads/" + AVATAR_SUBDIR + "/" + storedName)
                    .fileName(originalFilename)
                    .fileSize(file.getSize())
                    .contentType(contentType)
                    .build();
        } catch (IOException e) {
            log.error("Failed to store avatar {}", originalFilename, e);
            throw new BusinessException("Không thể lưu ảnh đại diện: " + e.getMessage());
        }
    }

    /** Xóa file ảnh đại diện cũ (chỉ trong uploads/avatars). */
    public void deleteAvatar(String publicUrl) {
        String prefix = "/uploads/" + AVATAR_SUBDIR + "/";
        if (publicUrl == null || !publicUrl.startsWith(prefix)) {
            return;
        }
        try {
            Path dir = Paths.get(uploadDir, AVATAR_SUBDIR).toAbsolutePath().normalize();
            Path file = dir.resolve(publicUrl.substring(prefix.length())).normalize();
            if (file.startsWith(dir)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            log.warn("Could not delete old avatar {}", publicUrl, e);
        }
    }

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

            String publicUrl = "/uploads/" + safeStoredName;

            return FileUploadResponse.builder()
                    .url(publicUrl)
                    .fileName(originalFilename)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

        } catch (IOException e) {
            log.error("Failed to store file {}", originalFilename, e);
            throw new BusinessException("Không thể lưu trữ tệp tin trên máy chủ: " + e.getMessage());
        }
    }
}
