package com.fairshare.contribution.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.user.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Component
public class ScoringEngine {

    @Data
    @Builder
    public static class MemberContributionResult {
        private User user;
        private int cardsCompleted;
        private double totalStoryPoints;
        private double onTimeRate;
        private double rawScore;
        private BigDecimal percentage;
        private BigDecimal finalScore;
    }

    /**
     * Compute contribution scores v1 for a set of members and their associated activity events.
     */
    public List<MemberContributionResult> calculateScores(List<User> members, List<ActivityEvent> events) {
        if (members == null || members.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, List<ActivityEvent>> userEventsMap = new HashMap<>();
        for (User member : members) {
            userEventsMap.put(member.getId(), new ArrayList<>());
        }

        if (events != null) {
            for (ActivityEvent event : events) {
                if (event.getUser() != null && userEventsMap.containsKey(event.getUser().getId())) {
                    userEventsMap.get(event.getUser().getId()).add(event);
                }
            }
        }

        List<MemberContributionResult> results = new ArrayList<>();
        double totalRawScore = 0.0;

        for (User member : members) {
            List<ActivityEvent> userEvents = userEventsMap.get(member.getId());

            int cardsCompleted = 0;
            double totalStoryPoints = 0.0;
            int onTimeCount = 0;
            int collabCount = 0;

            for (ActivityEvent e : userEvents) {
                String type = e.getEventType() != null ? e.getEventType().toUpperCase() : "";

                if (type.contains("COMPLETED") || type.contains("DONE")) {
                    cardsCompleted++;
                    if (e.getStoryPoints() != null) {
                        totalStoryPoints += e.getStoryPoints();
                    }
                    if (Boolean.TRUE.equals(e.getIsOnTime())) {
                        onTimeCount++;
                    }
                } else if (type.contains("CARD_CREATED") || type.contains("CARD_MOVED")) {
                    if (e.getStoryPoints() != null && e.getStoryPoints() > 0) {
                        totalStoryPoints += e.getStoryPoints() * 0.2; // partial credit for moving/progress
                    }
                }

                if (type.contains("COMMENT") || type.contains("HELPFUL") || type.contains("REVIEW") || type.contains("SUPPORT")) {
                    collabCount++;
                }
            }

            double onTimeRate = cardsCompleted > 0 ? (double) onTimeCount / cardsCompleted : 1.0;
            double rawScore = (totalStoryPoints * 1.5) + (cardsCompleted * 3.0) + (onTimeRate * 10.0) + (collabCount * 2.0);

            // Base threshold if the user has activities
            if (!userEvents.isEmpty() && rawScore == 0.0) {
                rawScore = 1.0;
            }

            totalRawScore += rawScore;

            results.add(MemberContributionResult.builder()
                    .user(member)
                    .cardsCompleted(cardsCompleted)
                    .totalStoryPoints(totalStoryPoints)
                    .onTimeRate(onTimeRate)
                    .rawScore(rawScore)
                    .build());
        }

        int memberCount = members.size();

        for (MemberContributionResult result : results) {
            BigDecimal percentage;
            BigDecimal finalScore;

            if (totalRawScore > 0.0) {
                double pct = result.getRawScore() / totalRawScore;
                percentage = BigDecimal.valueOf(pct).setScale(4, RoundingMode.HALF_UP);
                finalScore = BigDecimal.valueOf(pct * 100.0).setScale(2, RoundingMode.HALF_UP);
            } else {
                // Default equal share
                double equalShare = 1.0 / memberCount;
                percentage = BigDecimal.valueOf(equalShare).setScale(4, RoundingMode.HALF_UP);
                finalScore = BigDecimal.valueOf(equalShare * 100.0).setScale(2, RoundingMode.HALF_UP);
            }

            result.setPercentage(percentage);
            result.setFinalScore(finalScore);
        }

        return results;
    }
}
