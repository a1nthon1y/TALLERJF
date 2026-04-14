import { getAllOwners } from '@/services/ownersService';
import { useQuery } from "@tanstack/react-query";

export const useOwners = () => {
  const {isLoading, data, isError, isFetching, refetch } = useQuery({
    queryKey: ["owners"],
    queryFn: getAllOwners,  
  });

  return {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  };
};