"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bus, Wrench, AlertTriangle, DollarSign, CheckCircle2,
  XCircle, ShieldCheck, Gauge, ChevronRight,
} from "lucide-react";
import { getMyUnits, getPartsStatus } from "@/services/unitsService";
import { getMyUnitsReport } from "@/services/ownersService";
import { makeGetRequest } from "@/utils/api";
import Link from "next/link";

function fleetHealth(partsMap) {
  let totalCriticas = 0;
  let totalAtencion = 0;
  let totalUnidades = Object.keys(partsMap).length;

  for (const parts of Object.values(partsMap)) {
    const criticas = parts.filter((p) => Number(p.porcentaje) >= 100).length;
    const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length;
    totalCriticas += criticas;
    totalAtencion += atencion;
  }

  return { totalCriticas, totalAtencion, totalUnidades };
}

function unitHealthBadge(parts) {
  if (!parts) return null;
  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100).length;
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length;
  if (criticas > 0)
    return (
      <Badge variant="destructive" className="text-xs flex items-center gap-1">
        <XCircle className="h-3 w-3" /> {criticas} vencida{criticas > 1 ? "s" : ""}
      </Badge>
    );
  if (atencion > 0)
    return (
      <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> {atencion} en atención
      </Badge>
    );
  return (
    <Badge className="text-xs bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" /> OK
    </Badge>
  );
}

export default function DuenoDashboardPage() {
  const [units, setUnits] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [partsMap, setPartsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [unitsData, maintsData] = await Promise.all([
          getMyUnits(),
          getMyUnitsReport(),
        ]);
        const unitsList = Array.isArray(unitsData) ? unitsData : [];
        setUnits(unitsList);
        setMaintenances(Array.isArray(maintsData) ? maintsData : []);

        const alertsData = await makeGetRequest("/alerts").catch(() => null);
        if (alertsData === null) setError("No se pudieron cargar las alertas de mantenimiento.");
        setAlerts(Array.isArray(alertsData) ? alertsData : []);

        // Cargar estado de componentes de todas las unidades
        const entries = await Promise.allSettled(
          unitsList.map((u) => getPartsStatus(u.id).then((parts) => [u.id, parts]))
        );
        const map = {};
        for (const r of entries) {
          if (r.status === "fulfilled") {
            const [id, parts] = r.value;
            map[id] = Array.isArray(parts) ? parts : [];
          }
        }
        setPartsMap(map);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pendingMaints = maintenances.filter(
    (m) => m.estado === "PENDIENTE" || m.estado === "EN_PROCESO"
  );
  const totalInvertido = maintenances.reduce(
    (sum, m) => sum + Number(m.costo_total || 0),
    0
  );
  const { totalCriticas, totalAtencion } = fleetHealth(partsMap);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tus unidades y mantenimientos</p>
      </div>

      {error && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-3 flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Banner de salud de flota */}
      {Object.keys(partsMap).length > 0 && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          totalCriticas > 0
            ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800"
            : totalAtencion > 0
            ? "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800"
            : "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800"
        }`}>
          <div className={`rounded-full p-3 shrink-0 ${
            totalCriticas > 0 ? "bg-red-100 dark:bg-red-900/60" :
            totalAtencion > 0 ? "bg-orange-100 dark:bg-orange-900/60" :
            "bg-green-100 dark:bg-green-900/60"
          }`}>
            {totalCriticas > 0
              ? <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
              : totalAtencion > 0
              ? <AlertTriangle className="h-7 w-7 text-orange-500 dark:text-orange-400" />
              : <ShieldCheck className="h-7 w-7 text-green-600 dark:text-green-400" />}
          </div>
          <div className="flex-1">
            <p className={`font-bold text-base ${
              totalCriticas > 0 ? "text-red-700 dark:text-red-400" :
              totalAtencion > 0 ? "text-orange-700 dark:text-orange-400" :
              "text-green-700 dark:text-green-400"
            }`}>
              {totalCriticas > 0
                ? `Flota con mantenimiento urgente — ${totalCriticas} parte${totalCriticas > 1 ? "s" : ""} vencida${totalCriticas > 1 ? "s" : ""}`
                : totalAtencion > 0
                ? `Flota en atención — ${totalAtencion} parte${totalAtencion > 1 ? "s" : ""} próxima${totalAtencion > 1 ? "s" : ""} a vencer`
                : "Flota operativa — Todos los componentes en buen estado"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {units.length} unidad{units.length !== 1 ? "es" : ""} monitoreada{units.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/dueno/mis-unidades">
              Ver detalle <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mis Unidades</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mantenimientos</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenances.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMaints.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Partes Vencidas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCriticas > 0 ? "text-destructive" : ""}`}>
              {totalCriticas}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invertido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInvertido > 0 ? `S/. ${totalInvertido.toFixed(2)}` : "S/. 0.00"}
            </div>
            <p className="text-xs text-muted-foreground">en materiales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis unidades con salud */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" /> Salud de Mis Unidades
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dueno/mis-unidades" className="text-xs text-muted-foreground">
                Ver todas <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes unidades asignadas.</p>
            ) : (
              <div className="space-y-3">
                {units.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{u.placa}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.modelo} — {u.kilometraje?.toLocaleString()} km
                      </p>
                      {u.chofer_nombre ? (
                        <p className="text-xs text-muted-foreground">Chofer: {u.chofer_nombre}</p>
                      ) : (
                        <p className="text-xs text-yellow-600">Sin chofer asignado</p>
                      )}
                    </div>
                    <div className="text-right">
                      {unitHealthBadge(partsMap[u.id])}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos mantenimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Mantenimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay mantenimientos registrados.</p>
            ) : (
              <div className="space-y-3">
                {maintenances.slice(0, 5).map((m) => (
                  <div key={m.mantenimiento_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{m.unidad}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.tipo?.toLowerCase()}</p>
                    </div>
                    <Badge
                      variant={
                        m.estado === "COMPLETADO" || m.estado === "CERRADO"
                          ? "default"
                          : m.estado === "EN_PROCESO"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {m.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
