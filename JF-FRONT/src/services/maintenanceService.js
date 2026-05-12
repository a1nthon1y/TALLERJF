import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export const maintenanceService = {
  async getMaintenances() {
    try {
      return await makeGetRequest("/maintenances");
    } catch (error) {
      throw new Error(error.message || 'Error al obtener mantenimientos');
    }
  },

  async getMaintenanceById(id) {
    try {
      return await makeGetRequest(`/maintenances/${id}`);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener mantenimiento');
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


  async getMyJobs() {
    try {
      return await makeGetRequest('/maintenances/my-jobs');
    } catch (error) {
      throw new Error(error.message || 'Error al obtener trabajos asignados');
    }
  },

  async updateMyJobStatus(maintenanceId, estado, { partes_reparadas = [], notas_tecnico = '' } = {}) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/my-status`, {
        estado,
        partes_reparadas,
        notas_tecnico,
      });
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar estado del trabajo');
    }
  },

  async closeMaintenance(maintenanceId, observaciones_cierre = '') {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/close`, { observaciones_cierre });
    } catch (error) {
      throw new Error(error.message || 'Error al cerrar el mantenimiento');
    }
  },

  async getMaintenanceMaterials(maintenanceId) {
    try {
      return await makeGetRequest(`/maintenances/${maintenanceId}/materials`);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener materiales del mantenimiento');
    }
  },

  async addMaintenanceMaterial(maintenanceId, material_id, cantidad) {
    try {
      return await makePostRequest(`/maintenances/${maintenanceId}/materials`, { material_id, cantidad });
    } catch (error) {
      throw new Error(error.message || 'Error al agregar material');
    }
  },

  async removeMaintenanceMaterial(maintenanceId, detalleId) {
    try {
      return await makeDeleteRequest(`/maintenances/${maintenanceId}/materials/${detalleId}`);
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar material');
    }
  },

  async editMaintenance(maintenanceId, payload) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/edit`, payload);
    } catch (error) {
      throw new Error(error.message || 'Error al guardar cambios');
    }
  },

  async assignTecnico(maintenanceId, tecnico_id) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/tecnico`, { tecnico_id });
    } catch (error) {
      throw new Error(error.message || 'Error al reasignar técnico');
    }
  },

  async deleteMaintenance(maintenanceId) {
    try {
      return await makeDeleteRequest(`/maintenances/${maintenanceId}`);
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar mantenimiento');
    }
  },

  async updateObservaciones(maintenanceId, observaciones) {
    try {
      return await makePutRequest(`/maintenances/${maintenanceId}/observaciones`, { observaciones });
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar observaciones');
    }
  },
};
