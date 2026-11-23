package com.fairshare.upload;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.upload.dto.FileUploadResponse;
import com.fairshare.upload.service.FileUploadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class FileUploadServiceTest {

    @InjectMocks
    private FileUploadService fileUploadService;

    @Test
    @DisplayName("Upload file hợp lệ thành công và trả về URL")
    void testUploadFile_Success() {
        ReflectionTestUtils.setField(fileUploadService, "uploadDir", "target/test-uploads");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-screenshot.png",
                "image/png",
                "dummy image content".getBytes()
        );

        FileUploadResponse response = fileUploadService.uploadFile(file);

        assertNotNull(response);
        assertTrue(response.getUrl().startsWith("/uploads/"));
        assertEquals("test-screenshot.png", response.getFileName());
        assertEquals("image/png", response.getContentType());
        assertTrue(response.getFileSize() > 0);

        // Cleanup
        File testDir = new File("target/test-uploads");
        if (testDir.exists()) {
            File[] files = testDir.listFiles();
            if (files != null) {
                for (File f : files) f.delete();
            }
        }
    }

    @Test
    @DisplayName("Upload file rỗng phải ném ngoại lệ BusinessException")
    void testUploadFile_EmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "", "image/png", new byte[0]);

        assertThrows(BusinessException.class, () -> fileUploadService.uploadFile(emptyFile));
    }

    @Test
    @DisplayName("Upload avatar không có đuôi file (blob) tự suy luận phần mở rộng từ Content-Type")
    void testUploadAvatar_ExtensionlessFilename_DerivesFromContentType() {
        ReflectionTestUtils.setField(fileUploadService, "uploadDir", "target/test-uploads");

        MockMultipartFile avatar = new MockMultipartFile(
                "file",
                "blob",
                "image/png",
                "dummy png bytes".getBytes()
        );

        FileUploadResponse response = fileUploadService.uploadAvatar(avatar);

        assertNotNull(response);
        assertTrue(response.getUrl().startsWith("/uploads/avatars/"));
        assertTrue(response.getUrl().endsWith(".png"));
        assertEquals("image/png", response.getContentType());

        File avatarDir = new File("target/test-uploads/avatars");
        if (avatarDir.exists()) {
            File[] files = avatarDir.listFiles();
            if (files != null) {
                for (File f : files) f.delete();
            }
            avatarDir.delete();
        }
    }
}
