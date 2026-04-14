import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export const materialService = {

  async getMaterials() {
    try {
      const response = await makeGetRequest("/materials");
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al obtener los materiales");
    }
  },

  async createMaterial(materialData) {
    try {
      const response = await makePostRequest("/materials", materialData);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al crear el material");
    }
  },

  async updateMaterial(id, materialData) {
    try {
      const response = await makePutRequest(`/materials/${id}`, materialData);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al actualizar el material");
    }
  },

  async deleteMaterial(id) {
    try {
      const response = await makeDeleteRequest(`/materials/${id}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Error al eliminar el material");
    }
  }
} 