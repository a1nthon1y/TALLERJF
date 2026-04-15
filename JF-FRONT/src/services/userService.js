import { makeGetRequest, makePostRequest, makePutRequest } from '@/utils/api';
import { toast } from 'sonner';

export const userService = {
  async getUsers() {
    try {
      return await makeGetRequest('/users');
    } catch (error) {
      throw new Error(error.message || 'Error al obtener usuarios');
    }
  },

  async updateUser(id, userData) {
    try {
      return await makePutRequest(`/users/${id}`, userData);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar usuario');
      throw error;
    }
  },

  async toggleUserStatus(id, activo) {
    try {
      return await makePutRequest(`/users/${id}/status`, { activo });
    } catch (error) {
      toast.error(error.message || 'Error al cambiar estado del usuario');
      throw error;
    }
  },

  async createUser(userData) {
    try {
      return await makePostRequest('/users', userData);
    } catch (error) {
      toast.error(error.message || 'Error al crear usuario');
      throw error;
    }
  },
};

export default userService;
