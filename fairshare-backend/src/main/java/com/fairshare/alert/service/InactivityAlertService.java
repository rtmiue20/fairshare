package com.fairshare.alert.service;

import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InactivityAlertService {

    private final AlertRepository alertRepository;

    @Transactional(readOnly = true)
    public List<AlertDto> getAlertsByTeam(Long teamId, boolean includeResolved) {
        List<Alert> alerts = includeResolved
                ? alertRepository.findByTeamId(teamId)
                : alertRepository.findByTeamIdAndResolvedFalse(teamId);
        return alerts.stream().map(AlertDto::from).toList();
    }

    @Transactional
    public AlertDto resolveAlert(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        alert.setResolved(true);
        return AlertDto.from(alertRepository.save(alert));
    }
}
