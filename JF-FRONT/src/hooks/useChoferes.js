import { getAllChoferes } from '@/services/choferesService';
import { useQuery } from "@tanstack/react-query";

export const useChoferes = () => {
  const {isLoading, data, isError, isFetching, refetch } = useQuery({
    queryKey: ["choferes"],
    queryFn: getAllChoferes,
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

