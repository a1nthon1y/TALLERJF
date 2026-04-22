"use client";

import { useEffect, useState } from "react";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { maintenanceService } from "@/services/maintenanceService";
import { getPartsStatus } from "@/services/unitsService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle, Bus, Loader2, Gauge, CheckCircle2, AlertTriangle,
  ShieldCheck, XCircle,
} from "lucide-react";

const estadoBadge = (estado) => {
  const e = estado?.toLowerCase();
  if (e === "completado")
    return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "en_proceso")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

function BannerEstado({ parts, loading }) {
  if (loading || parts.length === 0) return null;

  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  const esCritico = criticas.length > 0;
  const esAtencion = !esCritico && atencion.length > 0;

  const config = esCritico
    ? {
        bg: "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800",
        iconBg: "bg-red-100 dark:bg-red-900/60",
        Icon: XCircle,
        iconClass: "text-red-600 dark:text-red-400",
        title: "No apto para salir — Mantenimiento urgente",
        titleClass: "text-red-700 dark:text-red-400",
        desc: `${criticas.length} parte${criticas.length > 1 ? "s" : ""} con mantenimiento vencido: ${criticas.map((p) => p.nombre).join(", ")}`,
      }
    : esAtencion
    ? {
        bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800",
        iconBg: "bg-orange-100 dark:bg-orange-900/60",
        Icon: AlertTriangle,
        iconClass: "text-orange-500 dark:text-orange-400",
        title: "Precaución — Partes próximas a vencer",
        titleClass: "text-orange-700 dark:text-orange-400",
        desc: `${atencion.length} parte${atencion.length > 1 ? "s" : ""} por encima del 80%: ${atencion.map((p) => p.nombre).join(", ")}`,
      }
    : {
        bg: "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800",
        iconBg: "bg-green-100 dark:bg-green-900/60",
        Icon: ShieldCheck,
        iconClass: "text-green-600 dark:text-green-400",
        title: "Unidad operativa — Apta para salir",
        titleClass: "text-green-700 dark:text-green-400",
        desc: "Todos los componentes están dentro de los límites de mantenimiento.",
      };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${config.bg}`}>
      <div className={`rounded-full p-3 shrink-0 ${config.iconBg}`}>
        <config.Icon className={`h-7 w-7 ${config.iconClass}`} />
      </div>
      <div>
        <p className={`font-bold text-base leading-tight ${config.titleClass}`}>{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.desc}</p>
      </div>
    </div>
  );
}

function PartRow({ p }) {
  const pct = Math.min(Number(p.porcentaje), 100);
  const kmRecorridos = Number(p.km_recorridos);
  const umbral = Number(p.umbral_km);
  const kmRestantes = Math.max(0, umbral - kmRecorridos);
  const vencido = Number(p.porcentaje) >= 100;
  const critico = Number(p.porcentaje) >= 80;

  const barColor =
    vencido ? "bg-red-500" :
    Number(p.porcentaje) >= 80 ? "bg-orange-400" :
    Number(p.porcentaje) >= 60 ? "bg-yellow-400" :
    "bg-green-500";

  const wrapClass = vencido
    ? "rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 p-3"
    : "space-y-1.5";

  return (
    <div className={wrapClass}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {vencido
            ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            : critico
            ? <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
          <span className="font-medium">{p.nombre}</span>
          {vencido && (
            <Badge variant="destructive" className="text-xs py-0 h-5">VENCIDO</Badge>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span>
            {kmRecorridos.toLocaleString()} / {umbral.toLocaleString()} km
            <span className="ml-1 font-semibold text-foreground">({pct}%)</span>
          </span>
          <div className={`text-right font-medium mt-0.5 ${vencido ? "text-red-600" : "text-muted-foreground"}`}>
            {vencido
              ? `Superado por ${(kmRecorridos - umbral).toLocaleString()} km`
              : `Faltan ${kmRestantes.toLocaleString()} km`}
          </div>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1.5">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
      setParts([]);
      setMaintenances([]);
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

  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  const ok = parts.filter((p) => Number(p.porcentaje) < 80);

  return (
    <div className="space-y-6">
      {/* Encabezado + selector de unidad */}
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

      {/* Banner de estado de viaje */}
      <BannerEstado parts={parts} loading={dataLoading} />

      {partialErrors.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-3 flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{partialErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* Info de la unidad */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bus className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Mi Unidad</h2>
          {!dataLoading && parts.length > 0 && (
            <Badge
              className={`ml-auto ${
                criticas.length > 0
                  ? "bg-red-100 text-red-700 border-red-300"
                  : atencion.length > 0
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-green-100 text-green-700 border-green-300"
              }`}
            >
              {criticas.length > 0
                ? `${criticas.length} crítica${criticas.length > 1 ? "s" : ""}`
                : atencion.length > 0
                ? `${atencion.length} en atención`
                : "Todo OK"}
            </Badge>
          )}
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

      {/* Estado de componentes */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Estado de Componentes</h2>
          {dataLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          ) : parts.length > 0 ? (
            <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
              {criticas.length > 0 && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {criticas.length} vencida{criticas.length > 1 ? "s" : ""}
                </span>
              )}
              {atencion.length > 0 && (
                <span className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {atencion.length} en atención
                </span>
              )}
              {ok.length > 0 && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {ok.length} OK
                </span>
              )}
            </div>
          ) : null}
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando componentes...
          </div>
        ) : parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reglas predictivas configuradas.</p>
        ) : (
          <div className="space-y-3">
            {parts.map((p) => <PartRow key={p.id} p={p} />)}
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
                    <TableCell className="text-sm whitespace-nowrap">
                      {m.fecha_solicitud
                        ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{m.tipo?.toLowerCase() ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="text-sm line-clamp-2">{m.observaciones || "—"}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
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
