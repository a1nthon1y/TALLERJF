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
  async updateConfig(id, data) {
    try {
      return await makePutRequest(`/config/${id}`, data);
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar configuración');
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
