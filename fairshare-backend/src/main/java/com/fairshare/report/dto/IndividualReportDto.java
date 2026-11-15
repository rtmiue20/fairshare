package com.fairshare.report.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class IndividualReportDto {
    private Long userId;
    private String userName;
    private String email;
    private String role;
    private Long teamId;
    private String teamName;
    private Long sprintId;
    private String sprintName;
    private String startDate;
    private String endDate;
    private double finalPct;
    private double d1Output;
    private double d2Reliability;
    private double d3Collaboration;
    private double d4Peer;
    private double compositeScore;
    private double availabilityFactor;
    private double confidenceIntervalLow;
    private double confidenceIntervalHigh;
    private boolean isSuspicious;
    private boolean hasSufficientEvidence;
    private List<EvidenceSummary> evidenceList;

    @Data
    @Builder
    public static class EvidenceSummary {
        private String taskName;
        private int storyPoints;
        private double earnedScore;
        private String eventTime;
        private String status;
    }
}
