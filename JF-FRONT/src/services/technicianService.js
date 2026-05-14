import { makeGetRequest, makePostRequest, makePutRequest } from '@/utils/api';

// Nota: NO existe `deleteTechnician`. La baja se hace vía soft-delete con
// `PUT /technicians/:id/status` (ver `app/tecnicos/page.jsx`). El backend no
// expone DELETE para técnicos para preservar el historial de mantenimientos.
export const technicianService = {
    async getTechnicians() {
        try {
            const response = await makeGetRequest("/technicians");
            return response;
        } catch (error) {
            throw new Error(error.message || 'Error al obtener tecnicos');
        }
    },

    async createTechnician(technicianData) {
        try {
            const response = await makePostRequest("/technicians", technicianData);
            return response;
        } catch (error) {
            throw new Error(error.message || "Error al crear el técnico");
        }
    },

    async updateTechnician(id, materialData) {
        try {
            const response = await makePutRequest(`/technicians/${id}`, materialData);
            return response;
        } catch (error) {
            throw new Error(error.message || "Error al actualizar el técnico");
        }
    },
}
