import { makeGetRequest, makePostRequest, makePutRequest, makePatchRequest, makeDeleteRequest } from '@/utils/api';

export async function getAllEspecialidades() {
  try {
    return await makeGetRequest("/especialidades");
  } catch (error) {
    throw new Error(error.message || 'Error al obtener especialidades');
  }
}

export async function createEspecialidad(data) {
  try {
    return await makePostRequest("/especialidades", data);
  } catch (error) {
    throw new Error(error.message || 'Error al crear especialidad');
  }
}

export async function updateEspecialidad(id, data) {
  try {
    return await makePutRequest(`/especialidades/${id}`, data);
  } catch (error) {
    throw new Error(error.message || 'Error al actualizar especialidad');
  }
}

export async function toggleEspecialidadStatus(id) {
  try {
    return await makePatchRequest(`/especialidades/${id}/status`, {});
  } catch (error) {
    throw new Error(error.message || 'Error al cambiar estado');
  }
}

export async function deleteEspecialidad(id) {
  try {
    return await makeDeleteRequest(`/especialidades/${id}`);
  } catch (error) {
    throw new Error(error.message || 'Error al eliminar especialidad');
  }
}
