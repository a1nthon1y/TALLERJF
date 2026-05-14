import axios from "axios";
import environment from "@/config/environment";
import { authService } from "@/services/authService";

const BASE_URL = environment.url_backend;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Si el token ha expirado o es inválido
      authService.logout();
      return Promise.reject(error);
    }
    
    // Para otros errores, mostrar el mensaje específico del backend
    // El backend puede devolver { message: "..." } o { error: "..." } según el endpoint
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Error en la petición';
    // Preservamos el body del backend (code, data adicional) en propiedades del Error
    // para que casos como UNIDADES_DESACTIVADAS o UNIDAD_DESACTIVADA puedan ser detectados
    // por la UI sin parsear strings.
    const enriched = new Error(errorMessage);
    enriched.code   = error.response?.data?.code;
    enriched.status = error.response?.status;
    enriched.data   = error.response?.data;
    return Promise.reject(enriched);
  }
);

// Re-lanzamos el Error original (que ya viene enriquecido por el interceptor con
// code/status/data del backend). Antes envolvíamos en `new Error(...)`, lo cual
// borraba esos campos y obligaba a parsear strings en la UI.
const rethrow = (error, fallback) => {
  if (error instanceof Error) throw error;
  throw new Error(error?.message || fallback);
};

export const makeGetRequest = async (url, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    rethrow(error, 'Error al obtener los datos');
  }
};

export const makePostRequest = async (url, data = {}) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    rethrow(error, 'Error al enviar los datos');
  }
};

export const makePutRequest = async (url, data = {}) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    rethrow(error, 'Error al actualizar los datos');
  }
};

export const makePatchRequest = async (url, data = {}) => {
  try {
    const response = await api.patch(url, data);
    return response.data;
  } catch (error) {
    rethrow(error, 'Error al actualizar los datos');
  }
};

export const makeDeleteRequest = async (url) => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    rethrow(error, 'Error al eliminar los datos');
  }
};

/**
 * Descarga un archivo binario (PDF/Excel/etc.) preservando autenticación,
 * el filename que sugiere el backend (Content-Disposition) y disparando el
 * "save as" del navegador. No bloquea la UI.
 */
export const downloadFile = async (url, params = {}, fallbackName = "archivo") => {
  try {
    const response = await api.get(url, { params, responseType: "blob" });
    const blob = new Blob([response.data], { type: response.headers["content-type"] });

    // Intentar extraer filename del Content-Disposition
    let filename = fallbackName;
    const cd = response.headers["content-disposition"];
    const match = cd && /filename="?([^";]+)"?/i.exec(cd);
    if (match?.[1]) filename = match[1];

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    throw new Error(error.message || "Error al descargar el archivo");
  }
};

export default api;