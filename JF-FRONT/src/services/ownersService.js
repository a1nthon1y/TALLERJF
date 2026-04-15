import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export async function getAllOwners() {
  try {
    return await makeGetRequest("/owners");
  } catch (error) {
    throw new Error(error.message || 'Error al obtener dueños');
  }
}

export async function getOwnerById(id) {
  try {
    return await makeGetRequest(`/owners/${id}`);
  } catch (error) {
    throw new Error(error.message || 'Error al obtener dueño');
  }
}

export async function createOwner(data) {
  try {
    return await makePostRequest("/owners", data);
  } catch (error) {
    throw new Error(error.message || 'Error al crear dueño');
  }
}

export async function updateOwner(id, data) {
  try {
    return await makePutRequest(`/owners/${id}`, data);
  } catch (error) {
    throw new Error(error.message || 'Error al actualizar dueño');
  }
}

export async function deleteOwner(id) {
  try {
    return await makeDeleteRequest(`/owners/${id}`);
  } catch (error) {
    throw new Error(error.message || 'Error al eliminar dueño');
  }
}
