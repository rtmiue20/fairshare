import apiClient from './client';

export const reportApi = {
  downloadPdfReport: async (teamId: number): Promise<Blob> => {
    const response = await apiClient.get(`/teams/${teamId}/report.pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
