import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export const maintenanceService = {
  // Obtener todos los mantenimientos
  async getMaintenances() {
    try {
      const response = await makeGetRequest("/maintenances");
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener mantenimientos');
    }
  },

  // Obtener mantenimientos por unidad
  async getMaintenancesByUnit(unidadId) {
    try {
      const response = await makeGetRequest(`/maintenances/unit/${unidadId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener mantenimientos');
    }
  },

  // Registrar nuevo mantenimiento
  async createMaintenance(maintenanceData) {
    try {
      // Por defecto, el estado es pendiente y se asigna un técnico
      const dataWithDefaults = {
        ...maintenanceData,
        estado: "pendiente",
        id_tecnico: maintenanceData.id_tecnico || null
      };
      const response = await makePostRequest('/maintenances', dataWithDefaults);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al crear mantenimiento');
    }
  },

  // Obtener detalles de un mantenimiento
  async getMaintenanceDetails(maintenanceId) {
    try {
      const response = await makeGetRequest(`/maintenances/${maintenanceId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener detalles');
    }
  },

  // Actualizar estado de un mantenimiento
  async updateMaintenanceStatus(maintenanceId, status) {
    try {
      const response = await makePutRequest(`/maintenances/${maintenanceId}`, { estado: status });
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al actualizar estado');
    }
  },

  // Asignar técnico a un mantenimiento
  async assignTechnician(maintenanceId, technicianId) {
    try {
      const response = await makePutRequest(`/maintenances/${maintenanceId}/assign`, { id_tecnico: technicianId });
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al asignar técnico');
    }
  }
}; 