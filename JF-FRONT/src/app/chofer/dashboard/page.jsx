"use client";

import { useEffect, useState } from "react";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { maintenanceService } from "@/services/maintenanceService";
import { getPartsStatus } from "@/services/unitsService";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Bus, Loader2, Gauge, CheckCircle2, AlertTriangle } from "lucide-react";

const estadoBadge = (estado) => {
  const e = estado?.toLowerCase();
  if (e === "completado")
    return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "en_proceso")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

export default function DriverDashboard() {
  const { unidades, unidad: selectedUnidad, setUnidad, loading, error } = useMiUnidad();
  const [parts, setParts] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [partialErrors, setPartialErrors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!selectedUnidad) return;
    async function loadUnitData() {
      setDataLoading(true);
      const [partsData, maintenanceData] = await Promise.allSettled([
        getPartsStatus(selectedUnidad.id),
        maintenanceService.getMaintenancesByUnit(selectedUnidad.id),
      ]);

      const errs = [];
      if (partsData.status === "rejected") errs.push("No se pudo cargar el estado de componentes.");
      if (maintenanceData.status === "rejected") errs.push("No se pudo cargar el historial de mantenimientos.");
      setPartialErrors(errs);

      setParts(partsData.status === "fulfilled" && Array.isArray(partsData.value) ? partsData.value : []);
      setMaintenances(maintenanceData.status === "fulfilled" && Array.isArray(maintenanceData.value) ? maintenanceData.value : []);
      setDataLoading(false);
    }
    loadUnitData();
  }, [selectedUnidad]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !selectedUnidad) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error || "No tienes una unidad asignada."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
          <p className="text-muted-foreground">Información de tu unidad asignada</p>
        </div>
        {unidades.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Unidad activa:</span>
            <Select
              value={String(selectedUnidad.id)}
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

      {partialErrors.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-3 flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>{partialErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* Info de la unidad */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bus className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Mi Unidad</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Placa", value: selectedUnidad.placa },
            { label: "Modelo", value: selectedUnidad.modelo },
            { label: "Año", value: selectedUnidad.año },
            { label: "Kilometraje", value: `${selectedUnidad.kilometraje?.toLocaleString() ?? "—"} km` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-semibold">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Estado de componentes con barras de progreso */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Estado de Componentes</h2>
          {dataLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          ) : (
            <span className="text-xs text-muted-foreground ml-auto">km recorridos desde último mantenimiento</span>
          )}
        </div>
        {dataLoading ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando componentes...
          </div>
        ) : parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reglas predictivas configuradas.</p>
        ) : (
          <div className="space-y-4">
            {parts.map((p) => {
              const pct = Math.min(Number(p.porcentaje), 100);
              const barColor =
                pct >= 100 ? "bg-red-500" :
                pct >= 80  ? "bg-orange-400" :
                pct >= 60  ? "bg-yellow-400" :
                "bg-green-500";
              const Icon =
                pct >= 80 ? <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" /> :
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {Icon}
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {Number(p.km_recorridos).toLocaleString()} / {Number(p.umbral_km).toLocaleString()} km
                      <span className="ml-1 font-semibold text-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pct >= 100 && (
                    <p className="text-xs text-red-600 font-medium">¡Requiere mantenimiento!</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Historial de mantenimientos */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Historial de Mantenimientos</h2>
        {dataLoading ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial...
          </div>
        ) : maintenances.length === 0 ? (
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
