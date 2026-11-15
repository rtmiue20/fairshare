package com.fairshare.report.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OverviewReportDto {
    private Long teamId;
    private String teamName;
    private Long sprintId;
    private String sprintName;
    private String startDate;
    private String endDate;
    private int totalMembers;
    private int totalTasks;
    private int totalEvents;
    private double giniCoefficient;
    private String giniLabel;
    private double consentRate;
    private String leaderName;
    private String inviteCode;
    private List<MemberReportDto> members;

    @Data
    @Builder
    public static class MemberReportDto {
        private Long userId;
        private String userName;
        private String email;
        private String role;
        private boolean isLeader;
        private double finalPct;
        private double d1Output;
        private double d2Reliability;
        private double d3Collaboration;
        private double d4Peer;
        private double compositeScore;
        private double availabilityFactor;
        private boolean isSuspicious;
        private boolean hasSufficientEvidence;
        private int tasksCompleted;
        private double confidenceIntervalLow;
        private double confidenceIntervalHigh;
        private String evidenceStatus;
    }
}
