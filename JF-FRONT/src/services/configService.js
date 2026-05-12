import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export const configService = {
  async getConfigs() {
    try {
      return await makeGetRequest("/config");
    } catch (error) {
      throw new Error(error.message || 'Error al obtener configuraciones');
    }
  },
  async createConfig(data) {
    try {
      return await makePostRequest("/config", data);
    } catch (error) {
      throw new Error(error.message || 'Error al crear configuración');
    }
  },
  async updateConfig(id, data, { resolveAlerts = false } = {}) {
    try {
      const url = resolveAlerts ? `/config/${id}?resolveAlerts=true` : `/config/${id}`;
      return await makePutRequest(url, data);
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar configuración');
    }
  },
  async getConfigImpact(id) {
    try {
      return await makeGetRequest(`/config/${id}/impact`);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener impacto');
    }
  },
  async deleteConfig(id) {
    try {
      return await makeDeleteRequest(`/config/${id}`);
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar configuración');
    }
  }
};
