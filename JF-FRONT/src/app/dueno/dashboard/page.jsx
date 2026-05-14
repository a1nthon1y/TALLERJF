"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  ShieldCheck, XCircle, AlertTriangle, AlertCircle,
  Wallet, ChevronRight, Bus, Wrench, CalendarClock,
  TrendingUp, TrendingDown, FileBarChart, ClipboardList,
} from "lucide-react";
import { getMyUnits, getPartsStatus } from "@/services/unitsService";
import { getMyUnitsReport, getMyOwnerProfile } from "@/services/ownersService";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMoneyShort = (n) => {
  const num = Number(n || 0);
  if (num >= 10000) return `S/ ${(num / 1000).toFixed(1)}k`;
  return fmtMoney(num);
};
const fmtDateShort = (d) =>
  d ? new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "—";

const daysAgo = (d) => {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const fmtRelative = (d) => {
  const days = daysAgo(d);
  if (days === null) return "—";
  if (days === 0)  return "hoy";
  if (days === 1)  return "ayer";
  if (days < 30)   return `hace ${days} días`;
  if (days < 365)  return `hace ${Math.floor(days / 30)} mes(es)`;
  return `hace ${Math.floor(days / 365)} año(s)`;
};

// ─── Salud por unidad ──────────────────────────────────────────────────────
function unitHealth(parts) {
  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  if (criticas.length > 0)
    return { level: "critico", priority: 0, label: `${criticas.length} vencida${criticas.length > 1 ? "s" : ""}`, parts: criticas };
  if (atencion.length > 0)
    return { level: "atencion", priority: 1, label: `${atencion.length} próxima${atencion.length > 1 ? "s" : ""}`, parts: atencion };
  return { level: "ok", priority: 2, label: "Todo OK", parts: [] };
}

// ─── Banner de flota (mantenido pero más informativo) ──────────────────────
function FleetBanner({ unitsHealth }) {
  if (unitsHealth.length === 0) return null;
  const totalCriticas = unitsHealth.reduce((s, u) => s + (u.health.level === "critico" ? u.health.parts.length : 0), 0);
  const totalAtencion = unitsHealth.reduce((s, u) => s + (u.health.level === "atencion" ? u.health.parts.length : 0), 0);
  const unitsCriticas = unitsHealth.filter((u) => u.health.level === "critico").length;

  if (totalCriticas > 0) {
    return (
      <Card className="border-red-300 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-full p-3 shrink-0 bg-red-100 dark:bg-red-900/60">
            <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight text-red-700 dark:text-red-400">
              Atención inmediata — {totalCriticas} parte{totalCriticas > 1 ? "s" : ""} vencida{totalCriticas > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unitsCriticas} unidad{unitsCriticas > 1 ? "es" : ""} no debería{unitsCriticas > 1 ? "n" : ""} salir a ruta sin mantenimiento.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/dueno/mis-unidades">Ver detalle <ChevronRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (totalAtencion > 0) {
    return (
      <Card className="border-orange-300 bg-orange-50/60 dark:bg-orange-950/30 dark:border-orange-800">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-full p-3 shrink-0 bg-orange-100 dark:bg-orange-900/60">
            <AlertTriangle className="h-7 w-7 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight text-orange-700 dark:text-orange-400">
              {totalAtencion} parte{totalAtencion > 1 ? "s" : ""} próxima{totalAtencion > 1 ? "s" : ""} a vencer
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Programa mantenimiento preventivo para evitar gastos mayores.
            </p>
          </div>
          <Button variant="outline" asChild size="sm" className="shrink-0">
            <Link href="/dueno/mis-unidades">Ver detalle <ChevronRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-300 bg-green-50/60 dark:bg-green-950/30 dark:border-green-800">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="rounded-full p-3 shrink-0 bg-green-100 dark:bg-green-900/60">
          <ShieldCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-tight text-green-700 dark:text-green-400">
            Tu flota está en buen estado
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Las {unitsHealth.length} unidad{unitsHealth.length > 1 ? "es" : ""} están al día con su mantenimiento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, hint, trend, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    green:   "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400",
    blue:    "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    amber:   "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    red:     "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`rounded-lg p-2.5 shrink-0 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-xl font-bold leading-tight tabular-nums truncate mt-0.5">{value}</p>
          {(hint || trend) && (
            <div className="flex items-center gap-1 text-[11px] mt-0.5">
              {trend && (
                <span className={`inline-flex items-center gap-0.5 font-medium ${
                  trend.direction === "up"   ? "text-green-600 dark:text-green-400" :
                  trend.direction === "down" ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                }`}>
                  {trend.direction === "up"   && <TrendingUp className="h-3 w-3" />}
                  {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
                  {trend.label}
                </span>
              )}
              {hint && <span className="text-muted-foreground truncate">{hint}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Card de Unidad (rica en información) ──────────────────────────────────
function FleetUnitCard({ unidad, health, lastMaint, totalSpent }) {
  const styleByLevel = {
    critico:  { ring: "ring-2 ring-red-200 dark:ring-red-900",       chip: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400",       Icon: XCircle,       iconColor: "text-red-500" },
    atencion: { ring: "ring-2 ring-orange-200 dark:ring-orange-900", chip: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400", Icon: AlertTriangle, iconColor: "text-orange-500" },
    ok:       { ring: "",                                            chip: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400",     Icon: ShieldCheck,   iconColor: "text-green-500" },
  };
  const cfg = styleByLevel[health.level];

  // Próxima parte a vencer (la más crítica)
  const nextPart = health.parts[0];

  return (
    <Link
      href="/dueno/mis-unidades"
      className={`group block rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden ${cfg.ring}`}
    >
      <div className="p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight">{unidad.placa}</p>
            <p className="text-xs text-muted-foreground truncate">
              {unidad.modelo}{unidad.año ? ` · ${unidad.año}` : ""}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] font-medium ${cfg.chip}`}>
            <cfg.Icon className="h-3 w-3 mr-0.5" />
            {health.label}
          </Badge>
        </div>

        {/* Próxima parte a vencer (si hay) */}
        {nextPart && (
          <div className={`text-xs rounded-md p-2 ${
            health.level === "critico"
              ? "bg-red-50 dark:bg-red-950/20"
              : "bg-orange-50 dark:bg-orange-950/20"
          }`}>
            <p className="font-medium truncate">{nextPart.nombre}</p>
            <p className="text-[11px] text-muted-foreground">
              {Number(nextPart.porcentaje) >= 100
                ? `Vencido hace ${(Number(nextPart.km_recorridos) - Number(nextPart.umbral_km)).toLocaleString()} km`
                : `Faltan ${(Number(nextPart.umbral_km) - Number(nextPart.km_recorridos)).toLocaleString()} km`}
            </p>
          </div>
        )}

        {/* Footer con métricas */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
          <span>
            {lastMaint
              ? <>Último mant. <span className="text-foreground font-medium">{fmtRelative(lastMaint)}</span></>
              : <span className="italic">Sin mantenimientos</span>}
          </span>
          {totalSpent > 0 && (
            <span className="tabular-nums font-medium text-foreground">{fmtMoneyShort(totalSpent)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Lista de actividad reciente ───────────────────────────────────────────
function RecentActivity({ items }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Aún no hay mantenimientos registrados.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <div className="divide-y">
        {items.map((m) => {
          const isPreventivo = m.tipo?.toUpperCase() === "PREVENTIVO";
          const costo = Number(m.costo_total || 0);
          return (
            <Link
              key={m.mantenimiento_id}
              href="/dueno/mantenimientos"
              className="block p-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-md p-2 shrink-0 ${isPreventivo
                  ? "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
                  : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"}`}>
                  <Wrench className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.unidad}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {isPreventivo ? "Preventivo" : "Correctivo"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDateShort(m.fecha_solicitud)} · {fmtRelative(m.fecha_solicitud)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${costo > 0 ? "" : "text-muted-foreground"}`}>
                    {fmtMoney(costo)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────
export default function DuenoDashboardPage() {
  const [units, setUnits]             = useState([]);
  const [partsMap, setPartsMap]       = useState({});
  const [maintenances, setMaintenances] = useState([]);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [unitsRes, maintsRes, profileRes] = await Promise.allSettled([
          getMyUnits(),
          getMyUnitsReport(),
          getMyOwnerProfile(),
        ]);

        const unitsList = unitsRes.status === "fulfilled" && Array.isArray(unitsRes.value) ? unitsRes.value : [];
        setUnits(unitsList);
        if (maintsRes.status === "fulfilled" && Array.isArray(maintsRes.value)) {
          setMaintenances(maintsRes.value);
        }
        if (profileRes.status === "fulfilled") {
          setProfile(profileRes.value);
        }

        const partsRes = await Promise.allSettled(
          unitsList.map((u) => getPartsStatus(u.id).then((parts) => [u.id, parts]))
        );
        const map = {};
        for (const r of partsRes) {
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

  // ── Cálculos derivados ────────────────────────────────────────────────
  const unitsWithHealth = useMemo(() => {
    return units
      .map((u) => {
        const parts = partsMap[u.id] ?? [];
        // Ordenar partes por urgencia (mayor % primero)
        const sortedParts = [...parts].sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje));
        const health = unitHealth(sortedParts);
        // Última actividad y gasto total por unidad
        const ms = maintenances.filter((m) => m.unidad === u.placa);
        const lastMaint  = ms.length > 0 ? ms[0].fecha_solicitud : null;
        const totalSpent = ms.reduce((s, m) => s + Number(m.costo_total || 0), 0);
        return { unit: u, health, lastMaint, totalSpent };
      })
      .sort((a, b) => a.health.priority - b.health.priority); // críticos primero
  }, [units, partsMap, maintenances]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const endOfLastMonth   = startOfThisMonth - 1;

    let gastoMes = 0, gastoMesAnterior = 0, enCurso = 0;
    for (const m of maintenances) {
      const ts = m.fecha_solicitud ? new Date(m.fecha_solicitud).getTime() : 0;
      if (ts >= startOfThisMonth) gastoMes += Number(m.costo_total || 0);
      else if (ts >= startOfLastMonth && ts <= endOfLastMonth) gastoMesAnterior += Number(m.costo_total || 0);
      const estado = m.estado?.toUpperCase();
      if (estado === "PENDIENTE" || estado === "EN_PROCESO") enCurso++;
    }

    let trend = null;
    if (gastoMesAnterior > 0) {
      const pct = Math.round(((gastoMes - gastoMesAnterior) / gastoMesAnterior) * 100);
      trend = {
        direction: pct > 5 ? "up" : pct < -5 ? "down" : "flat",
        label: `${pct > 0 ? "+" : ""}${pct}% vs mes anterior`,
      };
    } else if (gastoMes > 0) {
      trend = { direction: "up", label: "Sin gasto el mes anterior" };
    }

    const unidadesOk        = unitsWithHealth.filter((u) => u.health.level === "ok").length;
    const unidadesAtencion  = unitsWithHealth.filter((u) => u.health.level === "atencion").length;
    const unidadesCriticas  = unitsWithHealth.filter((u) => u.health.level === "critico").length;

    return { gastoMes, trend, enCurso, unidadesOk, unidadesAtencion, unidadesCriticas };
  }, [maintenances, unitsWithHealth]);

  const recentActivity = useMemo(() => maintenances.slice(0, 5), [maintenances]);

  if (loading) return <PageSkeleton variant="grid" rowCount={3} action={false} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  // Saludo según hora del día
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const nombreCorto = profile?.nombre?.split(" ")[0] || "";

  return (
    <div className="space-y-6">
      {/* Saludo personalizado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {saludo}{nombreCorto ? `, ${nombreCorto}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí está el estado actual de tu flota y tus gastos.
        </p>
      </div>

      {/* Banner de salud */}
      <FleetBanner unitsHealth={unitsWithHealth} />

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Bus}
          label="Mis unidades"
          value={units.length}
          hint={
            stats.unidadesCriticas > 0
              ? `${stats.unidadesCriticas} crítica${stats.unidadesCriticas > 1 ? "s" : ""}`
              : stats.unidadesAtencion > 0
              ? `${stats.unidadesAtencion} en atención`
              : `${stats.unidadesOk} en buen estado`
          }
          color={stats.unidadesCriticas > 0 ? "red" : stats.unidadesAtencion > 0 ? "amber" : "green"}
        />
        <KpiCard
          icon={Wallet}
          label="Gasto este mes"
          value={fmtMoney(stats.gastoMes)}
          trend={stats.trend}
          color="primary"
        />
        <KpiCard
          icon={Wrench}
          label="Mantenimientos en curso"
          value={stats.enCurso}
          hint={stats.enCurso > 0 ? "pendiente o en proceso" : "ninguno activo"}
          color="blue"
        />
        <KpiCard
          icon={CalendarClock}
          label="Próximos vencimientos"
          value={stats.unidadesAtencion + stats.unidadesCriticas}
          hint={stats.unidadesAtencion + stats.unidadesCriticas > 0 ? "unidades por atender" : "todo al día"}
          color={stats.unidadesCriticas > 0 ? "red" : "amber"}
        />
      </div>

      {/* Mi flota — cards visuales */}
      {unitsWithHealth.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bus className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No tienes unidades asignadas todavía.</p>
          </CardContent>
        </Card>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Mi flota</h2>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Link href="/dueno/mis-unidades">
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unitsWithHealth.map(({ unit, health, lastMaint, totalSpent }) => (
              <FleetUnitCard
                key={unit.id}
                unidad={unit}
                health={health}
                lastMaint={lastMaint}
                totalSpent={totalSpent}
              />
            ))}
          </div>
        </section>
      )}

      {/* Actividad reciente + acciones rápidas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Actividad reciente</h2>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Link href="/dueno/mantenimientos">
                Ver historial <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <RecentActivity items={recentActivity} />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start h-auto py-3">
              <Link href="/dueno/mantenimientos">
                <ClipboardList className="h-4 w-4 mr-3 text-blue-600" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">Historial de mantenimientos</p>
                  <p className="text-[11px] text-muted-foreground">Filtra y revisa todo lo realizado</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-auto py-3">
              <Link href="/dueno/reportes">
                <FileBarChart className="h-4 w-4 mr-3 text-green-600" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">Descargar reportes</p>
                  <p className="text-[11px] text-muted-foreground">Estado de cuenta en PDF o Excel</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-auto py-3">
              <Link href="/dueno/mis-unidades">
                <Bus className="h-4 w-4 mr-3 text-amber-600" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">Ver estado de unidades</p>
                  <p className="text-[11px] text-muted-foreground">Componentes, kilometraje y alertas</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
