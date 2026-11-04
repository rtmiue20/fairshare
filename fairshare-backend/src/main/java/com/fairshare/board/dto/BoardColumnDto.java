package com.fairshare.board.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardColumnDto {
    private Long id;
    private Long boardId;
    private String name;
    private int position;
    @Builder.Default
    private List<CardDto> cards = new ArrayList<>();
}
