"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { getMyUnits } from "@/services/unitsService";
import { getMyUnitsReport } from "@/services/ownersService";
import { makeGetRequest } from "@/utils/api";

export default function DuenoDashboardPage() {
  const [units, setUnits] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [unitsData, maintsData, alertsData] = await Promise.all([
          getMyUnits(),
          getMyUnitsReport(),
          makeGetRequest("/alerts").catch(() => []),
        ]);
        setUnits(Array.isArray(unitsData) ? unitsData : []);
        setMaintenances(Array.isArray(maintsData) ? maintsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
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
  const lastMaint = maintenances[0];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tus unidades y mantenimientos</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis Unidades</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{u.modelo} — {u.kilometraje?.toLocaleString()} km</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {u.chofer_nombre ? (
                        <span>Chofer: {u.chofer_nombre}</span>
                      ) : (
                        <span className="text-yellow-600">Sin chofer</span>
                      )}
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
                        m.estado === "COMPLETADO"
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
