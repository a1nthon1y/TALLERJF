import { makeGetRequest, makePostRequest, makePutRequest, makePatchRequest, makeDeleteRequest } from '@/utils/api';

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

// Activar / Desactivar chofer (soft disable)
export async function toggleChoferStatus(id) {
  try {
    const data = await makePatchRequest(`/choferes/${id}/status`, {});
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al cambiar estado del chofer');
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

// Obtener la unidad asignada al chofer autenticado.
// El backend puede devolver un 409 con code='UNIDADES_DESACTIVADAS' cuando todas
// las unidades del chofer están apagadas — ese caso lo manejamos en el dashboard
// para mostrar una pantalla amigable. Re-lanzamos el Error tal cual para preservar
// `code` y `data.unidades_desactivadas`.
export async function getMiUnidad() {
  return await makeGetRequest("/choferes/mi-unidad");
}

// Registrar Llegada Predictiva
export async function registrarLlegada(llegadaData) {
  try {
    const data = await makePostRequest("/choferes/llegada", llegadaData);
    return data;
  } catch (error) {
    throw new Error(error.message || 'Error al registrar llegada');
  }
}

// Obtener rutas disponibles
export async function getRutas() {
  try {
    const data = await makeGetRequest("/choferes/rutas");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

