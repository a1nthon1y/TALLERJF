import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';
export const technicianService = {
    // Obtener todos los tecnicos
    async getTechnicians() {
        try {
            const response = await makeGetRequest("/technicians");
            return response;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Error al obtener tecnicos');
        }
    },
    async createTechnician(technicianData) {
        try {
            const response = await makePostRequest("/technicians", technicianData);
            return response;
        } catch (error) {
            throw new Error(error.response?.data?.error || "Error al crear el técnico");
        }
    },

    async updateTechnician(id, materialData) {
        try {
            const response = await makePutRequest(`/technicians/${id}`, materialData);
            return response;
        } catch (error) {
            throw new Error(error.response?.data?.error || "Error al actualizar el técnico");
        }
    },

    async deleteTechnician(id) {
        try {
            const response = await makeDeleteRequest(`/technicians/${id}`);
            return response;
        } catch (error) {
            throw new Error(error.response?.data?.error || "Error al eliminar el técnico");
        }
    }

}