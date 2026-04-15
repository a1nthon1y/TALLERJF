"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { getMiUnidad } from "@/services/choferesService";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wrench } from "lucide-react";

const estadoBadge = (estado) => {
  const e = estado?.toLowerCase();
  if (e === "completado") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "en_proceso") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

export default function MisMantenimientosPage() {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { unidad } = await getMiUnidad();
        const data = await maintenanceService.getMaintenancesByUnit(unidad.id);
        setMantenimientos(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Error al cargar mantenimientos");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Mis Mantenimientos
        </h1>
        <p className="text-muted-foreground">Historial de mantenimientos de tu unidad asignada</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : error ? (
        <Card className="p-6 text-destructive">{error}</Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mantenimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No hay mantenimientos registrados para tu unidad.
                  </TableCell>
                </TableRow>
              ) : mantenimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium capitalize">{m.tipo}</TableCell>
                  <TableCell>{m.observaciones || "—"}</TableCell>
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
