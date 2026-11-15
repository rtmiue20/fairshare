package com.fairshare.report.dto;

import lombok.Data;
import java.util.List;

@Data
public class SendReportRequest {
    private Long teamId;
    private Long sprintId;
    private List<Long> userIds; // null = send to all
}
