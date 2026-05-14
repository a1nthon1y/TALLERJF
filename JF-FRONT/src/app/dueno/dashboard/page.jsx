"use client";

import { useEffect, useState } from "react";
import { getMyUnits, getPartsStatus } from "@/services/unitsService";
import { getMyUnitsReport } from "@/services/ownersService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  ShieldCheck, XCircle, AlertTriangle, AlertCircle,
  DollarSign, ChevronRight,
} from "lucide-react";
import Link from "next/link";

function calcHealth(parts) {
  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100).length;
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length;
  return { criticas, atencion };
}

function UnitChip({ unidad, health }) {
  const isCritica = health?.criticas > 0;
  const isAtencion = !isCritica && health?.atencion > 0;

  return (
    <Link
      href="/dueno/mis-unidades"
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors
        ${isCritica
          ? "border-red-300 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:border-red-800"
          : isAtencion
          ? "border-orange-300 bg-orange-50/60 hover:bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800"
          : "border-border bg-card hover:bg-muted"
        }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0
          ${isCritica ? "bg-red-500 animate-pulse" : isAtencion ? "bg-orange-400 animate-pulse" : "bg-green-500"}`}
      />
      <div className="leading-tight min-w-0">
        <p className="font-semibold">{unidad.placa}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[100px]">{unidad.modelo}</p>
      </div>
      {isCritica && (
        <Badge className="bg-red-500 text-white text-xs py-0 px-1.5 ml-auto shrink-0">
          {health.criticas} crítica{health.criticas > 1 ? "s" : ""}
        </Badge>
      )}
      {isAtencion && (
        <Badge className="bg-orange-400 text-white text-xs py-0 px-1.5 ml-auto shrink-0">
          {health.atencion} atención
        </Badge>
      )}
    </Link>
  );
}

function FleetBanner({ units, partsMap }) {
  if (units.length === 0 || Object.keys(partsMap).length === 0) return null;

  let totalCriticas = 0;
  let totalAtencion = 0;
  for (const parts of Object.values(partsMap)) {
    totalCriticas += parts.filter((p) => Number(p.porcentaje) >= 100).length;
    totalAtencion += parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length;
  }

  const esCritico = totalCriticas > 0;
  const esAtencion = !esCritico && totalAtencion > 0;

  const config = esCritico
    ? {
        bg: "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800",
        iconBg: "bg-red-100 dark:bg-red-900/60",
        Icon: XCircle,
        iconClass: "text-red-600 dark:text-red-400",
        title: `Flota con mantenimiento urgente — ${totalCriticas} parte${totalCriticas > 1 ? "s" : ""} vencida${totalCriticas > 1 ? "s" : ""}`,
        titleClass: "text-red-700 dark:text-red-400",
        desc: "Algunas unidades requieren atención inmediata antes de salir a ruta.",
      }
    : esAtencion
    ? {
        bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800",
        iconBg: "bg-orange-100 dark:bg-orange-900/60",
        Icon: AlertTriangle,
        iconClass: "text-orange-500 dark:text-orange-400",
        title: `Flota en atención — ${totalAtencion} parte${totalAtencion > 1 ? "s" : ""} próxima${totalAtencion > 1 ? "s" : ""} a vencer`,
        titleClass: "text-orange-700 dark:text-orange-400",
        desc: "Programa mantenimiento preventivo para evitar fallas en ruta.",
      }
    : {
        bg: "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800",
        iconBg: "bg-green-100 dark:bg-green-900/60",
        Icon: ShieldCheck,
        iconClass: "text-green-600 dark:text-green-400",
        title: "Flota operativa — Todos los componentes en buen estado",
        titleClass: "text-green-700 dark:text-green-400",
        desc: `${units.length} unidad${units.length !== 1 ? "es" : ""} monitoreada${units.length !== 1 ? "s" : ""} sin alertas activas.`,
      };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${config.bg}`}>
      <div className={`rounded-full p-3 shrink-0 ${config.iconBg}`}>
        <config.Icon className={`h-7 w-7 ${config.iconClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-base leading-tight ${config.titleClass}`}>{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.desc}</p>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0">
        <Link href="/dueno/mis-unidades">
          Ver detalle <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

export default function DuenoDashboardPage() {
  const [units, setUnits] = useState([]);
  const [partsMap, setPartsMap] = useState({});
  const [totalInvertido, setTotalInvertido] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [unitsData, maintsData] = await Promise.allSettled([
          getMyUnits(),
          getMyUnitsReport(),
        ]);

        const unitsList =
          unitsData.status === "fulfilled" && Array.isArray(unitsData.value)
            ? unitsData.value
            : [];
        setUnits(unitsList);

        if (maintsData.status === "fulfilled" && Array.isArray(maintsData.value)) {
          const total = maintsData.value.reduce(
            (sum, m) => sum + Number(m.costo_total || 0),
            0
          );
          setTotalInvertido(total);
        }

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

  if (loading) {
    return <PageSkeleton variant="grid" rowCount={3} action={false} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Panel</h1>
        <p className="text-muted-foreground text-sm">Estado de tus unidades</p>
      </div>

      {/* Banner de salud de flota */}
      <FleetBanner units={units} partsMap={partsMap} />

      {/* 2 stats clave */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Mis Unidades</p>
          <p className="text-3xl font-bold">{units.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">Total Invertido</p>
            <p className="text-3xl font-bold truncate">
              {totalInvertido > 0 ? `S/. ${totalInvertido.toFixed(0)}` : "S/. 0"}
            </p>
          </div>
          <DollarSign className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
        </div>
      </div>

      {/* Chips de unidades con semáforo */}
      {units.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          No tienes unidades asignadas.
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Mis unidades
            </h2>
            <Link
              href="/dueno/mis-unidades"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Ver detalle <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {units.map((u) => (
              <UnitChip key={u.id} unidad={u} health={calcHealth(partsMap[u.id] ?? [])} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
