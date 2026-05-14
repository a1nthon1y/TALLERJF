"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bus, Search, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, XCircle, Loader2, Gauge, ShieldCheck,
  User, ClipboardList, X,
} from "lucide-react";
import { getMyUnits, getPartsStatus } from "@/services/unitsService";
import { PageSkeleton } from "@/components/ui/page-skeleton";

// ─── Helpers ────────────────────────────────────────────────────────────────
function partLevel(p) {
  const pct = Number(p.porcentaje);
  if (pct >= 100) return "critico";
  if (pct >= 80)  return "atencion";
  return "ok";
}

function unitHealth(parts) {
  const criticas = parts.filter((p) => partLevel(p) === "critico");
  const atencion = parts.filter((p) => partLevel(p) === "atencion");
  if (criticas.length > 0)
    return { level: "critico",  priority: 0, label: `${criticas.length} vencida${criticas.length > 1 ? "s" : ""}`, count: criticas.length };
  if (atencion.length > 0)
    return { level: "atencion", priority: 1, label: `${atencion.length} próxima${atencion.length > 1 ? "s" : ""}`, count: atencion.length };
  return { level: "ok", priority: 2, label: "Todo OK", count: 0 };
}

const styleByLevel = {
  critico:  { ring: "ring-2 ring-red-200 dark:ring-red-900/60",       chip: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400",       Icon: XCircle,       iconColor: "text-red-500",     dot: "bg-red-500" },
  atencion: { ring: "ring-2 ring-orange-200 dark:ring-orange-900/60", chip: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400", Icon: AlertTriangle, iconColor: "text-orange-500", dot: "bg-orange-400" },
  ok:       { ring: "",                                                chip: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400",     Icon: ShieldCheck,   iconColor: "text-green-500",   dot: "bg-green-500" },
};

// ─── Card de unidad ────────────────────────────────────────────────────────
function UnitCard({ u, parts, partsLoading }) {
  const [open, setOpen] = useState(false);
  const health = parts ? unitHealth(parts) : null;
  const cfg = health ? styleByLevel[health.level] : null;

  const sortedParts = useMemo(
    () => (parts ? [...parts].sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje)) : []),
    [parts]
  );
  const nextPart = sortedParts[0];

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${cfg?.ring || ""}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-lg leading-tight">{u.placa}</p>
            <p className="text-xs text-muted-foreground truncate">
              {u.modelo}{u.año ? ` · ${u.año}` : ""}{u.tipo ? ` · ${u.tipo}` : ""}
            </p>
          </div>
          {health && (
            <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${cfg.chip}`}>
              <cfg.Icon className="h-3 w-3 mr-0.5" />
              {health.label}
            </Badge>
          )}
        </div>

        {/* Métricas inline */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Kilometraje</p>
            <p className="font-bold tabular-nums">{Number(u.kilometraje || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">km</span></p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" /> Chofer
            </p>
            <p className="font-medium text-xs truncate">
              {u.chofer_nombre ?? <span className="text-yellow-600 italic">Sin asignar</span>}
            </p>
          </div>
        </div>

        {/* Parte más urgente (si hay) */}
        {nextPart && health.level !== "ok" && (
          <div className={`rounded-md p-2.5 text-xs ${
            health.level === "critico" ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50 dark:bg-orange-950/20"
          }`}>
            <p className="font-semibold truncate">{nextPart.nombre}</p>
            <p className="text-[11px] text-muted-foreground">
              {Number(nextPart.porcentaje) >= 100
                ? `Vencido hace ${(Number(nextPart.km_recorridos) - Number(nextPart.umbral_km)).toLocaleString()} km`
                : `Faltan ${(Number(nextPart.umbral_km) - Number(nextPart.km_recorridos)).toLocaleString()} km`}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
          >
            <Link href="/dueno/mantenimientos">
              <ClipboardList className="h-3.5 w-3.5" /> Mantenimientos
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => setOpen((v) => !v)}
            disabled={partsLoading}
          >
            <Gauge className="h-3.5 w-3.5" />
            {partsLoading ? "Cargando…" : open ? "Ocultar" : "Componentes"}
          </Button>
        </div>

        {/* Detalle expandido — barras de componentes */}
        {open && (
          <div className="border-t pt-3 space-y-2">
            {partsLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando componentes...
              </div>
            ) : sortedParts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin reglas predictivas configuradas.
              </p>
            ) : (
              sortedParts.map((p) => {
                const pct = Math.min(Number(p.porcentaje), 100);
                const lvl = partLevel(p);
                const kmRestantes = Math.max(0, Number(p.umbral_km) - Number(p.km_recorridos));
                const barColor =
                  lvl === "critico"  ? "bg-red-500" :
                  lvl === "atencion" ? "bg-orange-400" :
                  pct >= 60          ? "bg-yellow-400" :
                                       "bg-green-500";
                const Icon =
                  lvl === "critico"  ? XCircle :
                  lvl === "atencion" ? AlertTriangle :
                                       CheckCircle2;
                const iconColor =
                  lvl === "critico"  ? "text-red-500" :
                  lvl === "atencion" ? "text-orange-400" :
                                       "text-green-500";
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                        <span className="font-medium truncate">{p.nombre}</span>
                      </div>
                      <span className={`text-[11px] font-medium tabular-nums shrink-0 ${
                        lvl === "critico" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      }`}>
                        {lvl === "critico"
                          ? `Vencido +${(Number(p.km_recorridos) - Number(p.umbral_km)).toLocaleString()} km`
                          : `${kmRestantes.toLocaleString()} km`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────
export default function DuenoMisUnidadesPage() {
  const [units, setUnits]         = useState([]);
  const [partsMap, setPartsMap]   = useState({});
  const [partsLoading, setPartsLoading] = useState(true);
  const [search, setSearch]       = useState("");
  const [healthFilter, setHealthFilter] = useState("__all__"); // __all__ | critico | atencion | ok
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Cargar unidades
  useEffect(() => {
    getMyUnits()
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Cargar partes en lote (para que el resumen y el orden funcionen sin click)
  useEffect(() => {
    if (units.length === 0) { setPartsLoading(false); return; }
    let cancelled = false;
    Promise.allSettled(
      units.map((u) => getPartsStatus(u.id).then((parts) => [u.id, parts]))
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          const [id, parts] = r.value;
          map[id] = Array.isArray(parts) ? parts : [];
        }
      }
      setPartsMap(map);
      setPartsLoading(false);
    });
    return () => { cancelled = true; };
  }, [units]);

  // Enriquecer unidades + filtrar + ordenar (críticas primero)
  const visibleUnits = useMemo(() => {
    const enriched = units.map((u) => {
      const parts = partsMap[u.id];
      const health = parts ? unitHealth(parts) : null;
      return { unit: u, parts, health };
    });

    const filtered = enriched.filter(({ unit, health }) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || unit.placa?.toLowerCase().includes(q) || unit.modelo?.toLowerCase().includes(q);
      const matchHealth = healthFilter === "__all__" || (health && health.level === healthFilter);
      return matchSearch && matchHealth;
    });

    return filtered.sort((a, b) => {
      const pa = a.health?.priority ?? 99;
      const pb = b.health?.priority ?? 99;
      if (pa !== pb) return pa - pb;
      return a.unit.placa.localeCompare(b.unit.placa);
    });
  }, [units, partsMap, search, healthFilter]);

  // Resumen por estado
  const summary = useMemo(() => {
    let critico = 0, atencion = 0, ok = 0, sin = 0;
    units.forEach((u) => {
      const parts = partsMap[u.id];
      if (!parts) { sin++; return; }
      const lvl = unitHealth(parts).level;
      if (lvl === "critico") critico++;
      else if (lvl === "atencion") atencion++;
      else ok++;
    });
    return { critico, atencion, ok, sin, total: units.length };
  }, [units, partsMap]);

  if (loading) return <PageSkeleton variant="grid" rowCount={4} />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">{error}</div>
    );
  }

  const hasFilters = search.trim() !== "" || healthFilter !== "__all__";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Unidades</h1>
        <p className="text-sm text-muted-foreground">
          {summary.total} unidad{summary.total !== 1 ? "es" : ""} en tu flota — ordenadas por urgencia.
        </p>
      </div>

      {/* Pills de resumen / filtros rápidos por salud */}
      {summary.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={healthFilter === "__all__"}
            onClick={() => setHealthFilter("__all__")}
            label="Todas"
            count={summary.total}
            color="default"
          />
          {summary.critico > 0 && (
            <FilterPill
              active={healthFilter === "critico"}
              onClick={() => setHealthFilter("critico")}
              label="Críticas"
              count={summary.critico}
              color="red"
              Icon={XCircle}
            />
          )}
          {summary.atencion > 0 && (
            <FilterPill
              active={healthFilter === "atencion"}
              onClick={() => setHealthFilter("atencion")}
              label="En atención"
              count={summary.atencion}
              color="amber"
              Icon={AlertTriangle}
            />
          )}
          {summary.ok > 0 && (
            <FilterPill
              active={healthFilter === "ok"}
              onClick={() => setHealthFilter("ok")}
              label="En buen estado"
              count={summary.ok}
              color="green"
              Icon={ShieldCheck}
            />
          )}
        </div>
      )}

      {/* Búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setHealthFilter("__all__"); }} className="gap-1.5 h-9">
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {visibleUnits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bus className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "No hay unidades que coincidan con los filtros."
                : "No tienes unidades asignadas."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(""); setHealthFilter("__all__"); }}>
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleUnits.map(({ unit, parts }) => (
            <UnitCard
              key={unit.id}
              u={unit}
              parts={parts}
              partsLoading={partsLoading && !parts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pill de filtro por salud ──────────────────────────────────────────────
function FilterPill({ active, onClick, label, count, color = "default", Icon }) {
  const colors = {
    default: active ? "bg-primary text-primary-foreground border-primary"          : "bg-card hover:bg-muted",
    red:     active ? "bg-red-500 text-white border-red-500"                       : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400",
    amber:   active ? "bg-orange-500 text-white border-orange-500"                 : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400",
    green:   active ? "bg-green-600 text-white border-green-600"                   : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${colors[color]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
        active ? "bg-white/20" : "bg-muted text-foreground"
      }`}>{count}</span>
    </button>
  );
}
