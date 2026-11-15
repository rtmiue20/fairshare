import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface MemberReportDto {
  userId: number;
  userName: string;
  email: string;
  role: string;
  isLeader: boolean;
  finalPct: number;
  d1Output: number;
  d2Reliability: number;
  d3Collaboration: number;
  d4Peer: number;
  compositeScore: number;
  availabilityFactor: number;
  isSuspicious: boolean;
  hasSufficientEvidence: boolean;
  tasksCompleted: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;
  evidenceStatus: string;
}

export interface OverviewReportDto {
  teamId: number;
  teamName: string;
  sprintId: number;
  sprintName: string;
  startDate: string;
  endDate: string;
  totalMembers: number;
  totalTasks: number;
  totalEvents: number;
  giniCoefficient: number;
  giniLabel: string;
  consentRate: number;
  leaderName: string;
  inviteCode: string;
  members: MemberReportDto[];
}

export interface EvidenceSummary {
  taskName: string;
  storyPoints: number;
  earnedScore: number;
  eventTime: string;
  status: string;
}

export interface IndividualReportDto {
  userId: number;
  userName: string;
  email: string;
  role: string;
  teamId: number;
  teamName: string;
  sprintId: number;
  sprintName: string;
  startDate: string;
  endDate: string;
  finalPct: number;
  d1Output: number;
  d2Reliability: number;
  d3Collaboration: number;
  d4Peer: number;
  compositeScore: number;
  availabilityFactor: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;
  isSuspicious: boolean;
  hasSufficientEvidence: boolean;
  evidenceList: EvidenceSummary[];
}

export const reportApi = {
  downloadPdfReport: async (teamId: number, sprintId: number): Promise<Blob> => {
    const response = await apiClient.get(`/reports/teams/${teamId}/sprints/${sprintId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getReportMetadata: async (teamId: number, sprintId: number) => {
    const response = await apiClient.get(`/reports/teams/${teamId}/sprints/${sprintId}`);
    return response.data;
  },

  getOverviewReport: async (teamId: number, sprintId: number): Promise<ApiResponse<OverviewReportDto>> => {
    const response = await apiClient.get(`/reports/overview?teamId=${teamId}&sprintId=${sprintId}`);
    return response.data;
  },

  getIndividualReport: async (teamId: number, sprintId: number, userId: number): Promise<ApiResponse<IndividualReportDto>> => {
    const response = await apiClient.get(`/reports/individual?teamId=${teamId}&sprintId=${sprintId}&userId=${userId}`);
    return response.data;
  },

  sendIndividualEmail: async (teamId: number, sprintId: number, userId: number): Promise<ApiResponse<string>> => {
    const response = await apiClient.post('/reports/send-email', {
      teamId,
      sprintId,
      userIds: [userId],
    });
    return response.data;
  },

  sendAllEmails: async (teamId: number, sprintId: number): Promise<ApiResponse<string>> => {
    const response = await apiClient.post('/reports/send-all-emails', {
      teamId,
      sprintId,
    });
    return response.data;
  },
};
