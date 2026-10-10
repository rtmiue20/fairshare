import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface ReviewCriterion {
  id: number;
  name: string;
  weight: number;
}

export interface ReviewRound {
  id: number;
  sprintId: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  deadline: string;
}

export interface ReviewSubmissionPayload {
  revieweeId: number;
  scores: { criterionId: number; score: number }[];
  comment?: string;
}

export interface PeerReviewResult {
  userId: number;
  userName: string;
  averageScore: number;
  submissionCount: number;
  isAnonymousValid: boolean;
}

export const peerReviewApi = {
  createRound: async (teamId: number, sprintId: number, deadline: string): Promise<ApiResponse<ReviewRound>> => {
    const response = await apiClient.post<ApiResponse<ReviewRound>>(`/teams/${teamId}/review-rounds`, {
      sprintId,
      deadline,
    });
    return response.data;
  },

  submitReview: async (roundId: number, payload: ReviewSubmissionPayload): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/review-rounds/${roundId}/submissions`, payload);
    return response.data;
  },

  getRoundResults: async (roundId: number): Promise<ApiResponse<PeerReviewResult[]>> => {
    const response = await apiClient.get<ApiResponse<PeerReviewResult[]>>(`/review-rounds/${roundId}/results`);
    return response.data;
  },
};
