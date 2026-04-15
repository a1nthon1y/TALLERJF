import { makeGetRequest, makePostRequest, makePutRequest } from '@/utils/api';

export const maintenanceService = {
  async getMaintenances() {
    try {
      return await makeGetRequest("/maintenances");
    } catch (error) {
      throw new Error(error.message || 'Error al obtener mantenimientos');
    }
  },

  async getMaintenancesByUnit(unidadId) {
    try {
      return await makeGetRequest(`/maintenances/unit/${unidadId}`);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener mantenimientos de la unidad');
    }
  },

  async createMaintenance(maintenanceData) {
    try {
      return await makePostRequest('/maintenances', {
        ...maintenanceData,
        estado: "PENDIENTE",
      });
    } catch (error) {
      throw new Error(error.message || 'Error al crear mantenimiento');
    }
  },

  async getMaintenanceDetails(maintenanceId) {
    try {
      return await makeGetRequest(`/maintenances/${maintenanceId}`);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener detalles del mantenimiento');
    }
  },

  async updateMaintenanceStatus(maintenanceId, status, partes_reparadas = [], tecnico_id = null) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}`, {
        estado: status,
        partes_reparadas,
        tecnico_id,
      });
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar estado del mantenimiento');
    }
  },

  async assignTechnician(maintenanceId, technicianId) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/assign`, {
        id_tecnico: technicianId,
      });
    } catch (error) {
      throw new Error(error.message || 'Error al asignar técnico');
    }
  },
};
