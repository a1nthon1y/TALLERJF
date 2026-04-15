import { makeGetRequest } from '@/utils/api';

export const reportService = {
  async getMyUnitReports() {
    try {
      return await makeGetRequest("/reports/my-unit");
    } catch (error) {
      throw new Error(error.message || 'Error al obtener reportes');
    }
  }
};
