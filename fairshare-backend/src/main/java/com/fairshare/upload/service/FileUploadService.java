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
