import { makeGetRequest, makePostRequest, makePutRequest } from '@/utils/api';

export const configService = {
  async getConfigs() {
    try {
      return await makeGetRequest("/config");
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener configuraciones');
    }
  },
  async createConfig(data) {
    try {
      return await makePostRequest("/config", data);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al crear configuración');
    }
  },
  async updateConfig(id, data) {
    try {
      return await makePutRequest(`/config/${id}`, data);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al actualizar configuración');
    }
  }
};
