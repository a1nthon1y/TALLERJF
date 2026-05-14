import { useState, useEffect } from "react";
import { getMiUnidad } from "@/services/choferesService";

/**
 * Hook para obtener las unidades asignadas al chofer autenticado.
 * Maneja la selección cuando el chofer tiene más de una unidad asignada.
 *
 * Cuando el backend responde con code='UNIDADES_DESACTIVADAS', exponemos
 * `unidadesDesactivadas` y un flag `solo_desactivadas` para que la UI pueda
 * mostrar un mensaje claro ("tu bus está fuera de servicio") en vez de un
 * error genérico.
 */
export function useMiUnidad() {
  const [unidades, setUnidades] = useState([]);
  const [unidadesDesactivadas, setUnidadesDesactivadas] = useState([]);
  const [soloDesactivadas, setSoloDesactivadas] = useState(false);
  const [unidad, setUnidad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUnidades() {
      try {
        const data = await getMiUnidad();
        const lista = data.unidades ?? [];
        setUnidades(lista);
        setUnidadesDesactivadas(data.unidades_desactivadas ?? []);
        if (lista.length > 0) setUnidad(lista[0]);
      } catch (err) {
        if (err.code === "UNIDADES_DESACTIVADAS") {
          setSoloDesactivadas(true);
          setUnidadesDesactivadas(err.data?.unidades_desactivadas ?? []);
          setError(err.message);
        } else {
          setError(err.message || "No tienes una unidad asignada");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchUnidades();
  }, []);

  return {
    unidades,
    unidadesDesactivadas,
    soloDesactivadas,
    unidad,
    setUnidad,
    loading,
    error,
  };
}
