import { useState, useEffect } from "react"
import { alertService } from "@/services/alertService"
import { toast } from "sonner"

export function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchAlerts = async () => {
    try {
      setIsLoading(true)
      const data = await alertService.getActiveAlerts()
      if (Array.isArray(data)) {
        setAlerts(data)
        setIsError(false)
      } else {
        setAlerts([])
        setIsError(true)
        toast.error('Error: La respuesta no es un array válido')
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
      toast.error(error.message)
      setAlerts([])
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const mutate = async () => {
    await fetchAlerts()
  }

  const resolveAlert = async (alertId) => {
    try {
      await alertService.resolveAlert(alertId)
      toast.success("Alerta resuelta correctamente")
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return {
    data: alerts,
    isLoading,
    isError,
    mutate,
    resolveAlert
  }
} 