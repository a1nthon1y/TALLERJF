import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';


  // Obtener todos los dueños
  export async function getAllOwners() {
    try {
      const data = await makeGetRequest("/owners");
      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al obtener dueños');
    }
  }
