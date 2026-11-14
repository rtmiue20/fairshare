package com.fairshare.board.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddAttachmentRequest {
    @NotBlank(message = "Tên tệp không được để trống")
    private String fileName;

    @NotBlank(message = "URL tệp không được để trống")
    private String fileUrl;

    private Long fileSize;
    private String contentType;
}
