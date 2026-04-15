"use client";

import { useEffect, useState } from "react";
import { getMiUnidad } from "@/services/choferesService";
import { maintenanceService } from "@/services/maintenanceService";
import { makeGetRequest } from "@/utils/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Bus, Wrench } from "lucide-react";

const estadoBadge = (estado) => {
  const e = estado?.toLowerCase();
  if (e === "completado")
    return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "en_proceso")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

export default function DriverDashboard() {
  const [unit, setUnit] = useState(null);
  const [parts, setParts] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDriverData() {
      try {
        const { unidad } = await getMiUnidad();
        setUnit(unidad);

        const [partsData, maintenanceData] = await Promise.allSettled([
          makeGetRequest(`/parts/${unidad.id}`),
          maintenanceService.getMaintenancesByUnit(unidad.id),
        ]);

        setParts(partsData.status === "fulfilled" && Array.isArray(partsData.value) ? partsData.value : []);
        setMaintenances(maintenanceData.status === "fulfilled" && Array.isArray(maintenanceData.value) ? maintenanceData.value : []);
      } catch (err) {
        setError(err.message || "No se pudo cargar la información del chofer");
      } finally {
        setLoading(false);
      }
    }
    loadDriverData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error || "No tienes una unidad asignada."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground">Información de tu unidad asignada</p>
      </div>

      {/* Info de la unidad */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bus className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Mi Unidad</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Placa", value: unit.placa },
            { label: "Modelo", value: unit.modelo },
            { label: "Año", value: unit.año },
            { label: "Kilometraje", value: `${unit.kilometraje?.toLocaleString() ?? "—"} km` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-semibold">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Estado de componentes */}
      {parts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Estado de Componentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parts.map((part) => (
              <div
                key={part.id}
                className={`rounded-lg border p-4 ${
                  part.estado === "ALERTA"
                    ? "border-destructive bg-destructive/5"
                    : "border-green-300 bg-green-50 dark:bg-green-950/20"
                }`}
              >
                <h3 className="font-semibold">{part.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Último mant.: {part.ultimo_mantenimiento_km?.toLocaleString() ?? "—"} km
                </p>
                <Badge
                  variant={part.estado === "ALERTA" ? "destructive" : "outline"}
                  className={part.estado !== "ALERTA" ? "border-green-500 text-green-600 mt-2" : "mt-2"}
                >
                  {part.estado === "ALERTA" ? "Requiere revisión" : "En buen estado"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historial de mantenimientos */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Historial de Mantenimientos</h2>
        {maintenances.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay mantenimientos registrados.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Kilometraje</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenances.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {m.fecha_solicitud
                        ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{m.tipo?.toLowerCase() ?? "—"}</TableCell>
                    <TableCell>{m.observaciones || "—"}</TableCell>
                    <TableCell>
                      {m.kilometraje_actual != null
                        ? `${m.kilometraje_actual.toLocaleString()} km`
                        : "—"}
                    </TableCell>
                    <TableCell>{estadoBadge(m.estado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
