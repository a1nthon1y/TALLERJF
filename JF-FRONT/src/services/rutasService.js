import { makeGetRequest, makePostRequest, makePutRequest, makeDeleteRequest } from '@/utils/api';

export const rutasService = {
  getAll: () => makeGetRequest("/rutas"),
  create: (data) => makePostRequest("/rutas", data),
  update: (id, data) => makePutRequest(`/rutas/${id}`, data),
  remove: (id) => makeDeleteRequest(`/rutas/${id}`),
};
