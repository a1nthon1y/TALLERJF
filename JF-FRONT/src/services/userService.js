import environment from '../config/environment';
import { authService } from './authService';
import api, { makeGetRequest, makePostRequest, makePutRequest } from '@/utils/api';
import { toast } from 'sonner';

export const userService = {

  // Obtener usuarios (endpoint protegido)
  async getUsers() {
    try {
      const response = await makeGetRequest('/users')
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener usuarios');
    }
  },


  // Actualizar usuario
  async updateUser(id, userData) {
    try {
      const response = await makePutRequest(`users/${id}`, userData);
      return response;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar usuario');
      throw error;
    }
  },

  // Activar/Desactivar usuario
  async toggleUserStatus(id, activo) {
    try {
      const response = await makePutRequest(`users/${id}/status`, { activo });    
      return response;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar estado del usuario');
      throw error;
    }
  },

  // Crear usuario
  async createUser(userData) {
    try {
      const response = await makePostRequest('users', userData);   
      return response;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al crear usuario');
      throw error;
    }
  }
};

export default userService;

const handleUpdateUser = async (values) => {
  try {
    const dataToSubmit = {
      ...values,
      password: values.password || undefined
    }
    await userService.updateUser(selectedUser.id, dataToSubmit)
    // ...
  } catch (error) {
    toast.error(error.message)
  }
}

