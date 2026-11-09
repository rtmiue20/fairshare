package com.fairshare.peerreview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateReviewRoundRequest {

    @NotBlank(message = "Review round name is required")
    @Size(max = 255, message = "Review round name must be at most 255 characters")
    private String name;

    private LocalDateTime startDate;

    private LocalDateTime endDate;
}
