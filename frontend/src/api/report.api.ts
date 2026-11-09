import apiClient from './client';

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
};
