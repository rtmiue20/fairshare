import apiClient from './client';
import { ApiResponse } from '../types/api';

export type ReviewCriterion = 'QUALITY' | 'PUNCTUALITY' | 'COOPERATION';

export const REVIEW_CRITERIA: { value: ReviewCriterion; label: string }[] = [
  { value: 'QUALITY', label: 'Chất lượng công việc' },
  { value: 'PUNCTUALITY', label: 'Tiến độ và đúng hạn' },
  { value: 'COOPERATION', label: 'Hợp tác với thành viên' },
];

export type ReviewRoundStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface ReviewRound {
  id: number;
  teamId: number;
  sprintId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  minSubmissionsRequired: number;
  status: ReviewRoundStatus;
}

export interface ReviewTeamMember {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  role: 'LEADER' | 'MEMBER';
}

export interface ReviewSprint {
  id: number;
  teamId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export interface CreateReviewRoundPayload {
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface ReviewSubmissionPayload {
  revieweeId: number;
  scores: { criterion: ReviewCriterion; score: number }[];
  feedback?: string;
}

export interface AggregatedReviewResult {
  revieweeId: number;
  averageScore: number;
  submissionCount: number;
  anonymousSafe: boolean;
  feedbackComments: string[];
}

export interface PeerReviewResult {
  userId: number;
  userName: string;
  averageScore: number;
  submissionCount: number;
  isAnonymousValid: boolean;
}

export const peerReviewApi = {
  getRoundsByTeam: async (teamId: number): Promise<ApiResponse<ReviewRound[]>> => {
    const response = await apiClient.get<ApiResponse<ReviewRound[]>>(`/review-rounds/team/${teamId}`);
    return response.data;
  },

  getMembers: async (teamId: number): Promise<ApiResponse<ReviewTeamMember[]>> => {
    const response = await apiClient.get<ApiResponse<ReviewTeamMember[]>>(`/teams/${teamId}/members`);
    return response.data;
  },

  getSprints: async (teamId: number): Promise<ApiResponse<ReviewSprint[]>> => {
    const response = await apiClient.get<ApiResponse<ReviewSprint[]>>(`/teams/${teamId}/sprints`);
    return response.data;
  },

  createRound: async (
    sprintId: number,
    payload: CreateReviewRoundPayload,
  ): Promise<ApiResponse<ReviewRound>> => {
    const response = await apiClient.post<ApiResponse<ReviewRound>>(
      `/review-rounds/sprint/${sprintId}`,
      payload,
    );
    return response.data;
  },

  openRound: async (roundId: number): Promise<ApiResponse<ReviewRound>> => {
    const response = await apiClient.post<ApiResponse<ReviewRound>>(`/review-rounds/${roundId}/open`);
    return response.data;
  },

  closeRound: async (roundId: number): Promise<ApiResponse<ReviewRound>> => {
    const response = await apiClient.post<ApiResponse<ReviewRound>>(`/review-rounds/${roundId}/close`);
    return response.data;
  },

  submitReview: async (
    roundId: number,
    payload: ReviewSubmissionPayload,
  ): Promise<ApiResponse<number>> => {
    const response = await apiClient.post<ApiResponse<number>>(
      `/review-rounds/${roundId}/submissions`,
      payload,
    );
    return response.data;
  },

  getRoundResults: async (
    roundId: number,
    revieweeId: number,
  ): Promise<ApiResponse<AggregatedReviewResult>> => {
    const response = await apiClient.get<ApiResponse<AggregatedReviewResult>>(
      `/review-rounds/${roundId}/results/${revieweeId}`,
    );
    return response.data;
  },
};
