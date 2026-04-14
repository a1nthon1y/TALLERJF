import { useState, useEffect } from "react"
import { maintenanceService } from "@/services/maintenanceService"
import { toast } from "sonner"

export function useMaintenances() {
  const [maintenances, setMaintenances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchMaintenances = async () => {
    try {
      setIsLoading(true)
      const data = await maintenanceService.getMaintenances()
      if (Array.isArray(data)) {
        setMaintenances(data)
        setIsError(false)
      } else {
        setMaintenances([])
        setIsError(true)
        toast.error('Error: La respuesta no es un array válido')
      }
    } catch (error) {
      console.error("Error fetching maintenances:", error)
      toast.error(error.message)
      setMaintenances([])
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMaintenances()
  }, [])

  const mutate = async () => {
    await fetchMaintenances()
  }

  return {
    data: maintenances,
    isLoading,
    isError,
    mutate
  }
} 