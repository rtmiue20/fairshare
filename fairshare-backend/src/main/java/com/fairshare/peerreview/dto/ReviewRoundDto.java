package com.fairshare.peerreview.dto;

import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewRoundStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ReviewRoundDto {
    Long id;
    Long teamId;
    Long sprintId;
    String name;
    LocalDateTime startDate;
    LocalDateTime endDate;
    int minSubmissionsRequired;
    ReviewRoundStatus status;

    public static ReviewRoundDto from(ReviewRound round) {
        return ReviewRoundDto.builder()
                .id(round.getId())
                .teamId(round.getTeam().getId())
                .sprintId(round.getSprint().getId())
                .name(round.getName())
                .startDate(round.getStartDate())
                .endDate(round.getEndDate())
                .minSubmissionsRequired(round.getMinSubmissionsRequired())
                .status(round.getStatus())
                .build();
    }
}
