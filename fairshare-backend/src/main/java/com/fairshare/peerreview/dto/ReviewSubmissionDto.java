package com.fairshare.peerreview.dto;

import com.fairshare.peerreview.entity.ReviewCriterion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ReviewSubmissionDto {

    @NotNull(message = "Reviewee is required")
    private Long revieweeId;

    @Valid
    private List<CriterionScore> scores;

    private ReviewCriterion criterion;

    @Min(value = 1, message = "Score must be from 1 to 5")
    @Max(value = 5, message = "Score must be from 1 to 5")
    private Integer score;

    @Size(max = 2000, message = "Feedback must be at most 2000 characters")
    private String feedback;

    public List<CriterionScore> getEffectiveScores() {
        if (scores != null && !scores.isEmpty()) {
            return scores;
        }
        if (criterion != null && score != null) {
            CriterionScore single = new CriterionScore();
            single.setCriterion(criterion);
            single.setScore(score);
            return List.of(single);
        }
        return scores;
    }

    @Getter
    @Setter
    public static class CriterionScore {

        @NotNull(message = "Criterion is required")
        private ReviewCriterion criterion;

        @NotNull(message = "Score is required")
        @Min(value = 1, message = "Score must be from 1 to 5")
        @Max(value = 5, message = "Score must be from 1 to 5")
        private Integer score;
    }
}
