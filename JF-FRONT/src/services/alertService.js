import { makeGetRequest, makePutRequest } from '@/utils/api';

export const alertService = {
  // Obtener todas las alertas activas
  async getActiveAlerts() {
    try {
      const response = await makeGetRequest("/alerts");
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener alertas');
    }
  },

  // Resolver una alerta
  async resolveAlert(alertId) {
    try {
      const response = await makePutRequest(`/alerts/${alertId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al resolver alerta');
    }
  }
}; 