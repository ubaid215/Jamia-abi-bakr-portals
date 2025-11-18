import api from './api';

const hifzReportService = {
  // Generate Hifz report
  generateHifzReport: async (filters = {}) => {
    const response = await api.get('/hifz-reports/generate', { params: filters });
    return response.data;
  }
};

export default hifzReportService;