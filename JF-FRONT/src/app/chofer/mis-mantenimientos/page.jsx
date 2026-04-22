"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wrench, Package } from "lucide-react";

const estadoBadge = (estado) => {
  const e = estado?.toLowerCase();
  if (e === "completado") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "en_proceso") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

export default function MisMantenimientosPage() {
  const { unidades, unidad, setUnidad, loading: loadingUnidad, error: unidadError } = useMiUnidad();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loadingMant, setLoadingMant] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!unidad) return;
    setLoadingMant(true);
    maintenanceService
      .getMaintenancesByUnit(unidad.id)
      .then((data) => setMantenimientos(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || "Error al cargar mantenimientos"))
      .finally(() => setLoadingMant(false));
  }, [unidad]);

  const loading = loadingUnidad || loadingMant;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Mis Mantenimientos
          </h1>
          <p className="text-muted-foreground">Historial de mantenimientos de tu unidad asignada</p>
        </div>
        {unidades.length > 1 && unidad && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Unidad:</span>
            <Select
              value={String(unidad.id)}
              onValueChange={(val) => {
                const u = unidades.find((u) => String(u.id) === val);
                if (u) setUnidad(u);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.placa} — {u.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : unidadError || error ? (
        <Card className="p-6 text-destructive">{unidadError || error}</Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Materiales</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mantenimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No hay mantenimientos registrados para tu unidad.
                  </TableCell>
                </TableRow>
              ) : mantenimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium capitalize">{m.tipo}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm line-clamp-2">{m.observaciones || "—"}</p>
                  </TableCell>
                  <TableCell>
                    {m.materiales_usados ? (
                      <div className="flex items-start gap-1">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{m.materiales_usados}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{m.kilometraje_actual?.toLocaleString()} km</TableCell>
                  <TableCell>{estadoBadge(m.estado)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.fecha_solicitud ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
