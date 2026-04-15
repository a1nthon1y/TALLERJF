import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

// Unidades del OWNER autenticado
export async function getMyUnits() {
  try {
    const data = await makeGetRequest("/units/my-units");
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener tus unidades');
  }
}

// Obtener todas las unidades
export async function getAllUnits() {
  try {
    const data = await makeGetRequest("/units");
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener unidades');
  }
}

// Obtener unidades por dueño
export async function getUnitsByOwner(duenoId) {
  try {
    const data = await makeGetRequest(`/units/owner/${duenoId}`);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener unidades por dueño');
  }
}

// Obtener una unidad por ID
export async function getUnitById(id) {
  try {
    const data = await makeGetRequest(`/units/${id}`);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener unidad');
  }
}

// Crear una unidad
export async function createUnit(unitData) {
  try {
    const data = await makePostRequest("/units", unitData);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al crear unidad');
  }
}

// Actualizar una unidad
export async function updateUnit(id, unitData) {
  try {
    const data = await makePutRequest(`/units/${id}`, unitData);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al actualizar unidad');
  }
}

// Eliminar una unidad
export async function deleteUnit(id) {
  try {
    const data = await makeDeleteRequest(`/units/${id}`);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al eliminar unidad');
  }
}

// Obtener unidad asignada a un chofer
export async function getDriverUnit(driverId) {
  try {
    const data = await makeGetRequest(`/units/driver/${driverId}`);
    return data.data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener unidad');
  }
}

// Obtener partes de una unidad
export async function getUnitParts(unitId) {
  try {
    const data = await makeGetRequest(`/parts/unit/${unitId}`);
    return data.data;
  } catch (error) {
    throw new Error(error.message || 'Error al obtener partes');
  }
}