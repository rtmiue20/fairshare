package com.fairshare.board.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardDto {
    private Long id;
    private Long teamId;
    private String name;
    private String description;
    @Builder.Default
    private List<BoardColumnDto> columns = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
