package com.fairshare.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Minh bạch hoá cấu trúc Prompt chuẩn 5 bước TCREI:
 * T - Task (Nhiệm vụ & Vai trò)
 * C - Context (Ngữ cảnh dữ liệu thật từ MariaDB)
 * R - Reference (Tài liệu tham chiếu công thức Mô hình 4 tầng)
 * E - Evaluate / Example (Tiêu chí tự kiểm định & Ví dụ chuẩn)
 * I - Iterate (Chiến lược lặp & Gợi ý câu hỏi đào sâu tiếp theo)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TcreiPromptBreakdownDto {
    private String task;
    private String context;
    private String reference;
    private String evaluate;
    private String iterate;
}
