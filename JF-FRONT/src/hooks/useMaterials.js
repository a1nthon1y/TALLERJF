import { useState, useEffect } from "react"
import { materialService } from "@/services/materialService"
import { toast } from "sonner"

export function useMaterials() {
  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchMaterials = async () => {
    try {
      setIsLoading(true)
      const data = await materialService.getMaterials()
      if (Array.isArray(data)) {
        setMaterials(data)
        setIsError(false)
      } else {
        setMaterials([])
        setIsError(true)
        toast.error('Error: La respuesta no es un array válido')
      }
    } catch (error) {
      console.error("Error fetching materials:", error)
      toast.error(error.message)
      setMaterials([])
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [])

  const mutate = async () => {
    await fetchMaterials()
  }

  return {
    data: materials,
    isLoading,
    isError,
    mutate
  }
} 