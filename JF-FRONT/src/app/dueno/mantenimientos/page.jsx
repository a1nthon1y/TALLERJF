"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ClipboardList, Search, ChevronDown, ChevronUp, Package, Wallet,
  Gauge, User, Calendar, MapPin, Bus, Wrench, TrendingUp, X, FileBarChart,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Link from "next/link";
import { getMyUnitsReport } from "@/services/ownersService";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const fmtMonth = (d) => {
  if (!d) return "Sin fecha";
  const date = new Date(d);
  const m = date.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  return m.charAt(0).toUpperCase() + m.slice(1);
};

const monthKey = (d) => {
  if (!d) return "ZZZZ-99";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

function parseObservaciones(text) {
  if (!text) return { procedencia: null, requerimientos: [], observaciones: null, raw: null };
  const isStructured =
    text.includes("PROCEDENCIA:") || text.includes("REQUERIMIENTOS:") || text.includes("OBSERVACIONES:");
  if (!isStructured) {
    const isRuta = text.startsWith("TRABAJO EN RUTA");
    return { procedencia: null, requerimientos: [], observaciones: isRuta ? null : text, raw: isRuta ? text : null };
  }
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let procedencia = null, requerimientos = [], observaciones = null, section = null;
  for (const line of lines) {
    if (line.startsWith("PROCEDENCIA:"))         { section = "proc"; procedencia = line.replace("PROCEDENCIA:", "").trim(); }
    else if (line.startsWith("REQUERIMIENTOS:")) { section = "req"; }
    else if (line.startsWith("OBSERVACIONES:"))  { section = "obs"; observaciones = line.replace("OBSERVACIONES:", "").trim(); }
    else if (section === "req" && line.startsWith("- ")) requerimientos.push(line.slice(2));
    else if (section === "obs") observaciones = (observaciones ? observaciones + " " : "") + line;
  }
  return { procedencia, requerimientos, observaciones, raw: null };
}

// ─── Badges ────────────────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const e = estado?.toUpperCase();
  const map = {
    COMPLETADO: { label: "Completado", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400" },
    REALIZADO:  { label: "En campo",   className: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-400" },
    CERRADO:    { label: "Cerrado",    className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900 dark:text-gray-400" },
    EN_PROCESO: { label: "En proceso", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400" },
    PENDIENTE:  { label: "Pendiente",  className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400" },
  };
  const cfg = map[e] || map.PENDIENTE;
  return <Badge variant="outline" className={`text-[10px] font-medium ${cfg.className}`}>{cfg.label}</Badge>;
}

function TipoBadge({ tipo }) {
  const isPreventivo = tipo?.toUpperCase() === "PREVENTIVO";
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${isPreventivo
      ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400"
      : "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400"}`}>
      {isPreventivo ? "Preventivo" : "Correctivo"}
    </Badge>
  );
}

// ─── Tarjeta de KPI ────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, hint, accent = "primary" }) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    green:   "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400",
    blue:    "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    amber:   "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2.5 shrink-0 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-lg font-bold leading-tight tabular-nums truncate">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detalle de materiales (expandible) ────────────────────────────────────
function MaterialesDetalle({ materiales, costoTotal }) {
  const mats = Array.isArray(materiales) ? materiales : [];
  if (mats.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sin materiales registrados.</p>;
  }
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[11px] font-medium text-muted-foreground border-b pb-1">
        <span>Material</span>
        <span className="text-right">Cant.</span>
        <span className="text-right">Subtotal</span>
      </div>
      {mats.map((m, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs items-center">
          <span>{m.nombre}</span>
          <span className="text-right text-muted-foreground tabular-nums">× {m.cantidad}</span>
          <span className="text-right font-medium tabular-nums">{fmtMoney(m.costo_total)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-xs font-bold border-t pt-1.5 mt-1">
        <span className="text-muted-foreground">Total materiales</span>
        <span className="text-primary tabular-nums">{fmtMoney(costoTotal)}</span>
      </div>
    </div>
  );
}

// ─── Item de mantenimiento (compacto, expandible) ──────────────────────────
function MantItem({ m }) {
  const [open, setOpen] = useState(false);
  const costo = Number(m.costo_total || 0);
  const hasMaterials = Array.isArray(m.materiales) && m.materiales.length > 0;
  const parsed = parseObservaciones(m.observaciones);
  const obsResumen =
    parsed.raw ||
    parsed.procedencia ||
    (parsed.requerimientos[0] ?? null) ||
    parsed.observaciones ||
    null;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Fecha como "block" izquierdo */}
          <div className="flex flex-col items-center justify-center shrink-0 w-12 leading-tight">
            <span className="text-[10px] uppercase text-muted-foreground">
              {m.fecha_solicitud
                ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE", { month: "short" }).replace(".", "")
                : "—"}
            </span>
            <span className="text-base font-bold tabular-nums">
              {m.fecha_solicitud ? new Date(m.fecha_solicitud).getDate() : "·"}
            </span>
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <TipoBadge tipo={m.tipo} />
              <EstadoBadge estado={m.estado} />
              {m.estado?.toUpperCase() === "REALIZADO" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                  <MapPin className="h-3 w-3" />Ruta
                </span>
              )}
              {m.codigo && (
                <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {m.codigo}
                </code>
              )}
            </div>
            {obsResumen && (
              <p className="text-xs text-muted-foreground line-clamp-1">{obsResumen}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {m.kilometraje_actual != null && (
                <span className="inline-flex items-center gap-1">
                  <Gauge className="h-3 w-3" />{Number(m.kilometraje_actual).toLocaleString()} km
                </span>
              )}
              {m.tecnico_nombre && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />{m.tecnico_nombre}
                </span>
              )}
              {hasMaterials && (
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" />{m.materiales.length} material(es)
                </span>
              )}
            </div>
          </div>

          {/* Costo + flecha */}
          <div className="flex items-start gap-2 shrink-0">
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums ${costo > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {fmtMoney(costo)}
              </p>
              {m.fecha_realizacion && (
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                  Cerrado {fmtDate(m.fecha_realizacion)}
                </p>
              )}
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground mt-1.5" />}
          </div>
        </div>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div className="border-t bg-muted/30 p-3 space-y-3">
          {/* Observaciones completas */}
          {(parsed.procedencia || parsed.requerimientos.length > 0 || parsed.observaciones || parsed.raw) && (
            <div className="space-y-1 text-xs">
              {parsed.procedencia && (
                <p><span className="font-semibold">Ruta:</span> <span className="text-muted-foreground">{parsed.procedencia}</span></p>
              )}
              {parsed.requerimientos.length > 0 && (
                <div>
                  <p className="font-semibold mb-0.5">Solicitud del chofer:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    {parsed.requerimientos.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {parsed.observaciones && (
                <p><span className="font-semibold">Observaciones:</span> <span className="text-muted-foreground whitespace-pre-line">{parsed.observaciones}</span></p>
              )}
              {parsed.raw && (
                <p className="text-muted-foreground italic">{parsed.raw}</p>
              )}
            </div>
          )}

          {/* Materiales */}
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide mb-1.5">
              Materiales
            </p>
            <MaterialesDetalle materiales={m.materiales} costoTotal={m.costo_total} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sección por Unidad (collapsible) ──────────────────────────────────────
function UnidadSeccion({ unidad, modelo, mantenimientos, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const totalCosto = mantenimientos.reduce((s, m) => s + Number(m.costo_total || 0), 0);
  const ultima = mantenimientos[0]; // ya viene ordenado DESC por fecha

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-lg p-2.5 shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Bus className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-bold">{unidad}</span>
              {modelo && <span className="text-xs text-muted-foreground">{modelo}</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
              <span>{mantenimientos.length} mantenimiento(s)</span>
              {ultima && <span>· Último: {fmtDate(ultima.fecha_solicitud)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase text-muted-foreground">Total invertido</p>
              <p className="text-lg font-bold text-primary tabular-nums">{fmtMoney(totalCosto)}</p>
            </div>
            {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          {mantenimientos.map((m) => <MantItem key={m.mantenimiento_id} m={m} />)}
        </div>
      )}
    </Card>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function DuenoMantenimientosPage() {
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [search, setSearch]             = useState("");
  const [unidadFilter, setUnidadFilter] = useState("__all__");
  const [estadoFilter, setEstadoFilter] = useState("__all__");
  const [tipoFilter, setTipoFilter]     = useState("__all__");
  const [periodoFilter, setPeriodoFilter] = useState("__all__"); // 30d, 90d, year, __all__

  useEffect(() => {
    getMyUnitsReport()
      .then((data) => setMaintenances(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Lista de unidades únicas
  const unidades = useMemo(() => {
    const map = new Map();
    maintenances.forEach((m) => {
      if (m.unidad && !map.has(m.unidad)) map.set(m.unidad, m.modelo);
    });
    return Array.from(map.entries()).map(([placa, modelo]) => ({ placa, modelo }));
  }, [maintenances]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    const now = Date.now();
    const periodMs = {
      "30d":  30  * 24 * 3600 * 1000,
      "90d":  90  * 24 * 3600 * 1000,
      "year": 365 * 24 * 3600 * 1000,
    }[periodoFilter];

    const s = search.trim().toLowerCase();
    return maintenances.filter((m) => {
      if (unidadFilter !== "__all__" && m.unidad !== unidadFilter) return false;
      if (estadoFilter !== "__all__" && m.estado?.toUpperCase() !== estadoFilter) return false;
      if (tipoFilter   !== "__all__" && m.tipo?.toUpperCase()   !== tipoFilter) return false;
      if (periodMs && m.fecha_solicitud && (now - new Date(m.fecha_solicitud).getTime()) > periodMs) return false;
      if (s) {
        return (
          m.unidad?.toLowerCase().includes(s) ||
          m.tipo?.toLowerCase().includes(s)   ||
          m.codigo?.toLowerCase().includes(s) ||
          m.tecnico_nombre?.toLowerCase().includes(s) ||
          m.observaciones?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [maintenances, unidadFilter, estadoFilter, tipoFilter, periodoFilter, search]);

  // KPIs (en base a lo filtrado)
  const kpis = useMemo(() => {
    const total      = filtered.reduce((s, m) => s + Number(m.costo_total || 0), 0);
    const cantidad   = filtered.length;
    const promedio   = cantidad > 0 ? total / cantidad : 0;
    // Unidad con mayor gasto
    const porUnidad = {};
    filtered.forEach((m) => {
      const k = m.unidad || "—";
      porUnidad[k] = (porUnidad[k] || 0) + Number(m.costo_total || 0);
    });
    const topUnidad = Object.entries(porUnidad).sort((a, b) => b[1] - a[1])[0];
    return { total, cantidad, promedio, topUnidad };
  }, [filtered]);

  // Vista 1: agrupado por unidad
  const grupoPorUnidad = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      const k = m.unidad || "Sin unidad";
      if (!map[k]) map[k] = { unidad: k, modelo: m.modelo, items: [] };
      map[k].items.push(m);
    });
    // Ordenar grupos por costo total DESC
    return Object.values(map)
      .map((g) => ({ ...g, total: g.items.reduce((s, m) => s + Number(m.costo_total || 0), 0) }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Vista 2: agrupado por mes
  const grupoPorMes = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      const k = monthKey(m.fecha_solicitud);
      if (!map[k]) map[k] = { mes: fmtMonth(m.fecha_solicitud), items: [] };
      map[k].items.push(m);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, g]) => ({ ...g, total: g.items.reduce((s, m) => s + Number(m.costo_total || 0), 0) }));
  }, [filtered]);

  const hasActiveFilters =
    search.trim() !== "" ||
    unidadFilter   !== "__all__" ||
    estadoFilter   !== "__all__" ||
    tipoFilter     !== "__all__" ||
    periodoFilter  !== "__all__";

  const resetFilters = () => {
    setSearch("");
    setUnidadFilter("__all__");
    setEstadoFilter("__all__");
    setTipoFilter("__all__");
    setPeriodoFilter("__all__");
  };

  if (loading) return <PageSkeleton variant="list" rowCount={5} />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mantenimientos</h1>
          <p className="text-sm text-muted-foreground">
            Historial de los mantenimientos realizados a tus unidades.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/dueno/reportes">
            <FileBarChart className="h-3.5 w-3.5" />
            Descargar reportes
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Total invertido"
          value={fmtMoney(kpis.total)}
          hint={hasActiveFilters ? "según filtros aplicados" : "histórico completo"}
          accent="primary"
        />
        <KpiCard
          icon={Wrench}
          label="Mantenimientos"
          value={kpis.cantidad}
          hint={hasActiveFilters ? "según filtros aplicados" : "histórico completo"}
          accent="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="Costo promedio"
          value={fmtMoney(kpis.promedio)}
          hint="por mantenimiento"
          accent="green"
        />
        <KpiCard
          icon={Bus}
          label="Mayor gasto"
          value={kpis.topUnidad ? kpis.topUnidad[0] : "—"}
          hint={kpis.topUnidad ? fmtMoney(kpis.topUnidad[1]) : "Sin datos"}
          accent="amber"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, técnico, observación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={unidadFilter} onValueChange={setUnidadFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las unidades</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.placa} value={u.placa}>{u.placa}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="EN_PROCESO">En proceso</SelectItem>
              <SelectItem value="COMPLETADO">Completado</SelectItem>
              <SelectItem value="REALIZADO">En campo</SelectItem>
              <SelectItem value="CERRADO">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tipos</SelectItem>
              <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
              <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todo el historial</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />Limpiar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabs de vista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Ningún mantenimiento coincide con los filtros aplicados."
                : "Aún no hay mantenimientos registrados en tus unidades."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">Limpiar filtros</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="por-unidad">
          <TabsList>
            <TabsTrigger value="por-unidad" className="gap-1.5">
              <Bus className="h-3.5 w-3.5" /> Por Unidad
              <Badge variant="secondary" className="ml-1 text-[10px]">{grupoPorUnidad.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cronologico" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Cronológico
              <Badge variant="secondary" className="ml-1 text-[10px]">{filtered.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Vista por unidad ── */}
          <TabsContent value="por-unidad" className="space-y-3 mt-4">
            {grupoPorUnidad.map((g, idx) => (
              <UnidadSeccion
                key={g.unidad}
                unidad={g.unidad}
                modelo={g.modelo}
                mantenimientos={g.items}
                defaultOpen={idx === 0 && grupoPorUnidad.length <= 3}
              />
            ))}
          </TabsContent>

          {/* ── Vista cronológica ── */}
          <TabsContent value="cronologico" className="space-y-5 mt-4">
            {grupoPorMes.map((g) => (
              <div key={g.mes} className="space-y-2">
                <div className="flex items-center justify-between sticky top-0 z-10 bg-background/90 backdrop-blur py-1.5">
                  <h3 className="text-sm font-semibold">{g.mes}</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {g.items.length} mant. · {fmtMoney(g.total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.items.map((m) => <MantItem key={m.mantenimiento_id} m={m} />)}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
