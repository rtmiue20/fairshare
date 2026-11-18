package com.fairshare.peerreview.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeerReviewDetailDto {

    private Long id;
    private Long reviewRoundId;
    private Long revieweeId;
    private String revieweeName;
    private Double averageScore;
    private Double qualityScore;
    private Double punctualityScore;
    private Double cooperationScore;
    private int submissionCount;
    private boolean anonymousSafe;
    private List<String> feedbackComments;
    private LocalDateTime submittedAt;
}
