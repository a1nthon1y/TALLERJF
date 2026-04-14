import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

// Obtener todos los choferes
export async function getAllChoferes() {
  try {
    const data = await makeGetRequest("/choferes");
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener choferes');
  }
}

// Obtener chofer por ID
export async function getChoferById(id) {
  try {
    const data = await makeGetRequest(`/choferes/${id}`);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener chofer');
  }
}

// Crear chofer
export async function createChofer(choferData) {
  try {
    const data = await makePostRequest("/choferes", choferData);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al crear chofer');
  }
}

// Actualizar chofer
export async function updateChofer(id, choferData) {
  try {
    const data = await makePutRequest(`/choferes/${id}`, choferData);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al actualizar chofer');
  }
}

// Eliminar chofer
export async function deleteChofer(id) {
  try {
    const data = await makeDeleteRequest(`/choferes/${id}`);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al eliminar chofer');
  }
}

// Registrar Llegada Predictiva
export async function registrarLlegada(llegadaData) {
  try {
    const data = await makePostRequest("/choferes/llegada", llegadaData);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.response?.data?.message || 'Error al registrar llegada');
  }
}

