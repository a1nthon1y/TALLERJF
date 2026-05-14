import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

// Nota: este service NO dispara toasts — los componentes deciden cómo
// notificar (success/warning/error). Mantenemos los services como capa
// pura de transporte para evitar duplicación de notificaciones.
export const userService = {
  async getUsers() {
    return await makeGetRequest('/users');
  },

  async updateUser(id, userData) {
    return await makePutRequest(`/users/${id}`, userData);
  },

  async toggleUserStatus(id, activo) {
    return await makePutRequest(`/users/${id}/status`, { activo });
  },

  async createUser(userData) {
    return await makePostRequest('/users', userData);
  },

  async deleteUser(id) {
    return await makeDeleteRequest(`/users/${id}`);
  },
};

export default userService;
