"use client";

import { useState, useEffect } from "react";
import { getAllUnits, getPartsStatus } from "@/services/unitsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown, ChevronUp, Gauge,
  AlertTriangle, CheckCircle2, XCircle, Bus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partColor(pct) {
  if (pct >= 100) return { bar: "bg-red-500",    text: "text-red-600" };
  if (pct >= 80)  return { bar: "bg-orange-400", text: "text-orange-500" };
  if (pct >= 60)  return { bar: "bg-yellow-400", text: "text-yellow-500" };
  return           { bar: "bg-green-500",  text: "text-green-500" };
}

function unitHealthBadge(parts) {
  if (!parts) return null;
  const vencidas = parts.filter((p) => Number(p.porcentaje) >= 100).length;
  const proximas = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length;
  if (vencidas > 0)
    return (
      <Badge className="bg-red-100 text-red-700 border-red-300 text-xs flex items-center gap-1">
        <XCircle className="h-3 w-3" /> {vencidas} vencida{vencidas > 1 ? "s" : ""}
      </Badge>
    );
  if (proximas > 0)
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> {proximas} próxima{proximas > 1 ? "s" : ""}
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" /> En orden
    </Badge>
  );
}

// ─── Fila de unidad ───────────────────────────────────────────────────────────

function UnitPartsRow({ unit, parts, loading }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Cabecera — siempre visible, badge inmediato */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Bus className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <span className="font-medium text-sm">{unit.placa}</span>
            {unit.modelo && (
              <span className="text-xs text-muted-foreground ml-2">{unit.modelo}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {(unit.kilometraje || 0).toLocaleString()} km
          </span>
          {/* Badge de salud — visible inmediatamente sin necesidad de abrir */}
          {loading
            ? <Skeleton className="h-5 w-16 rounded-full" />
            : unitHealthBadge(parts ?? [])}
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Detalle de partes — solo al expandir */}
      {open && (
        <div className="px-4 pb-4 pt-3 border-t space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded" />)}
            </div>
          ) : !parts || parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin reglas predictivas configuradas.</p>
          ) : (
            parts.map((p) => {
              const pct = Math.min(Number(p.porcentaje), 100);
              const { bar, text } = partColor(Number(p.porcentaje));
              const vencido = Number(p.porcentaje) >= 100;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{p.nombre}</span>
                    <span className={`font-semibold tabular-nums ${text}`}>
                      {Number(p.porcentaje).toFixed(0)}%
                      {vencido && (
                        <span className="ml-1 text-red-500">
                          (+{(Number(p.km_recorridos) - Number(p.umbral_km)).toLocaleString()} km)
                        </span>
                      )}
                      {!vencido && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          · faltan {Math.max(0, Number(p.umbral_km) - Number(p.km_recorridos)).toLocaleString()} km
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FleetPartsStatus() {
  const [show, setShow] = useState(false);
  const [units, setUnits] = useState([]);
  const [partsMap, setPartsMap] = useState({}); // { [unitId]: Part[] }
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Carga unidades al montar (siempre, para saber el conteo)
  useEffect(() => {
    setLoadingUnits(true);
    getAllUnits()
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch(() => setUnits([]))
      .finally(() => setLoadingUnits(false));
  }, []);

  // Carga estado de partes en paralelo la primera vez que se abre el panel
  useEffect(() => {
    if (!show || units.length === 0) return;
    if (Object.keys(partsMap).length > 0) return; // ya cargado, no re-fetch

    setLoadingParts(true);
    Promise.allSettled(
      units.map((u) => getPartsStatus(u.id).then((parts) => [u.id, parts]))
    ).then((results) => {
      const map = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          const [id, parts] = r.value;
          map[id] = Array.isArray(parts) ? parts : [];
        }
      }
      setPartsMap(map);
    }).finally(() => setLoadingParts(false));
  }, [show, units]);

  const anyLoading = loadingUnits || loadingParts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Estado Predictivo de Flota
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShow((v) => !v)}>
            {show
              ? <><ChevronUp className="h-4 w-4 mr-1" /> Ocultar</>
              : <><ChevronDown className="h-4 w-4 mr-1" /> Ver flota ({units.length} unidades)</>}
          </Button>
        </div>
        {!show && (
          <p className="text-xs text-muted-foreground">
            Progreso de km recorridos vs umbral de mantenimiento por parte, para cada unidad.
          </p>
        )}
      </CardHeader>

      {show && (
        <CardContent className="space-y-2 pt-0">
          {loadingUnits ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay unidades registradas.</p>
          ) : (
            units.map((u) => (
              <UnitPartsRow
                key={u.id}
                unit={u}
                parts={partsMap[u.id]}
                loading={loadingParts && !partsMap[u.id]}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
