import { getAllUnits, getUnitsByOwner } from '@/services/unitsService';
import { useQuery } from "@tanstack/react-query";
import { authService } from '@/services/authService';

export const useUnits = (ownerId = null) => {
  const user = authService.getUser();
  
  // Si se proporciona un ownerId específico, usarlo
  // Si el usuario es dueño (tiene dueno_id), obtener solo sus unidades
  const effectiveOwnerId = ownerId || (user?.dueno_id ? user.dueno_id : null);
  
  const {isLoading, data, isError, isFetching, refetch } = useQuery({
    queryKey: effectiveOwnerId ? ["units", "owner", effectiveOwnerId] : ["units"],
    queryFn: () => effectiveOwnerId ? getUnitsByOwner(effectiveOwnerId) : getAllUnits(),
    enabled: true, // Siempre habilitado
  });

  // Función mutate para mantener consistencia con otros hooks
  const mutate = async () => {
    await refetch();
  };

  return {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    mutate,
  };
};