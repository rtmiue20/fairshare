package com.fairshare.peerreview.repository;

import com.fairshare.peerreview.entity.ReviewSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewSubmissionRepository extends JpaRepository<ReviewSubmission, Long> {
    List<ReviewSubmission> findByReviewRoundId(Long reviewRoundId);
    List<ReviewSubmission> findByReviewRoundIdAndRevieweeId(Long reviewRoundId, Long revieweeId);
}
