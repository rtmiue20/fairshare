package com.fairshare.board.repository;

import com.fairshare.board.entity.CardAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardAttachmentRepository extends JpaRepository<CardAttachment, Long> {
    List<CardAttachment> findByCardIdOrderByCreatedAtDesc(Long cardId);
    Optional<CardAttachment> findByIdAndCardId(Long id, Long cardId);
}
