import { useState, useEffect } from 'react';
import { userService } from '@/services/userService';
import { toast } from 'sonner';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
        setIsError(false);
      } else {
        setUsers([]);
        setIsError(true);
        toast.error('Error: La respuesta no es un array válido');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setIsError(true);
      toast.error('Error al cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const mutate = async () => {
    try {
      setIsLoading(true);
      await fetchUsers();
    } catch (error) {
      console.error('Error in mutate:', error);
      toast.error('Error al actualizar la lista de usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: users,
    isLoading,
    isError,
    mutate
  };
}

