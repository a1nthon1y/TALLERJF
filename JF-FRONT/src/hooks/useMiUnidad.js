import { useState, useEffect } from "react";
import { getMiUnidad } from "@/services/choferesService";

/**
 * Hook para obtener las unidades asignadas al chofer autenticado.
 * Maneja la selección cuando el chofer tiene más de una unidad asignada.
 */
export function useMiUnidad() {
  const [unidades, setUnidades] = useState([]);
  const [unidad, setUnidad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUnidades() {
      try {
        const data = await getMiUnidad();
        const lista = data.unidades ?? [];
        setUnidades(lista);
        // Auto-seleccionar la primera (o la única) unidad
        if (lista.length > 0) {
          setUnidad(lista[0]);
        }
      } catch (err) {
        setError(err.message || "No tienes una unidad asignada");
      } finally {
        setLoading(false);
      }
    }
    fetchUnidades();
  }, []);

  return { unidades, unidad, setUnidad, loading, error };
}
