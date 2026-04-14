import { useState, useEffect } from 'react';
import { technicianService } from '@/services/technicianService';
import { toast } from 'sonner';

export function useTechnicians() {
  const [technicians, setTechnicians] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchTechnicians = async () => {
    try {
      setIsLoading(true);
      const data = await technicianService.getTechnicians();
      if (Array.isArray(data)) {
        setTechnicians(data);
        setIsError(false);
      } else {
        setTechnicians([]);
        setIsError(true);
        toast.error('Error: La respuesta no es un array válido');
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setTechnicians([]);
      setIsError(true);
      toast.error('Error al cargar los técnicos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const mutate = async () => {
    try {
      setIsLoading(true);
      await fetchTechnicians();
    } catch (error) {
      console.error('Error in mutate:', error);
      toast.error('Error al actualizar la lista de técnicos');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: technicians,
    isLoading,
    isError,
    mutate
  };
} 