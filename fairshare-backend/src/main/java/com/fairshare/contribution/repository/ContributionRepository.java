package com.fairshare.contribution.repository;

import org.springframework.data.repository.NoRepositoryBean;

/**
 * @deprecated Sử dụng {@link ContributionScoreRepository} thay thế.
 */
@Deprecated
@NoRepositoryBean
public interface ContributionRepository extends ContributionScoreRepository {
}
