import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface ActivityEventDto {
  id: number;
  teamId: number;
  userId?: number;
  sprintId?: number;
  source: string;
  eventType: string;
  details: string;
  storyPoints?: number;
  difficultyLevel?: number;
  isOnTime?: boolean;
  delayDays?: number;
  completionStatus?: string;
  occurredAt: string;
}

export const activityApi = {
  getByTeam: async (teamId: number): Promise<ApiResponse<ActivityEventDto[]>> => {
    const response = await apiClient.get<ApiResponse<ActivityEventDto[]>>(`/activities/team/${teamId}`);
    return response.data;
  },
};
