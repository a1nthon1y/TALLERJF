"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllUnits, getPartsStatus } from "@/services/unitsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Gauge, AlertTriangle, CheckCircle2, Bus } from "lucide-react";
import { Loader2 } from "lucide-react";

function partColor(pct) {
  if (pct >= 100) return { bar: "bg-red-500", badge: "destructive", icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> };
  if (pct >= 80) return { bar: "bg-orange-400", badge: "warning", icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-400" /> };
  if (pct >= 60) return { bar: "bg-yellow-400", badge: "secondary", icon: <Gauge className="h-3.5 w-3.5 text-yellow-500" /> };
  return { bar: "bg-green-500", badge: "outline", icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> };
}

function UnitPartsRow({ unit }) {
  const [open, setOpen] = useState(false);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-status", unit.id],
    queryFn: () => getPartsStatus(unit.id),
    enabled: open,
    staleTime: 60_000,
  });

  const criticalCount = parts.filter((p) => p.porcentaje >= 80).length;
  const worstPct = parts.length > 0 ? Math.max(...parts.map((p) => Number(p.porcentaje))) : 0;
  const { badge } = partColor(worstPct);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${open ? "Colapsar" : "Expandir"} partes de ${unit.placa}`}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg text-left"
      >
        <div className="flex items-center gap-3">
          <Bus className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="font-medium text-sm">{unit.placa}</span>
            <span className="text-xs text-muted-foreground ml-2">{unit.modelo}</span>
          </div>
          <span className="text-xs text-muted-foreground">{(unit.kilometraje || 0).toLocaleString()} km</span>
          {criticalCount > 0 && open && (
            <Badge variant="destructive" className="text-xs">{criticalCount} crítica{criticalCount > 1 ? "s" : ""}</Badge>
          )}
          {!open && worstPct >= 80 && (
            <Badge variant={badge} className="text-xs">
              {worstPct >= 100 ? "Vencido" : "Atención"}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando partes...
            </div>
          ) : parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin reglas predictivas configuradas.</p>
          ) : (
            parts.map((p) => {
              const pct = Math.min(Number(p.porcentaje), 100);
              const { bar, icon } = partColor(pct);
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {icon}
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {Number(p.km_recorridos).toLocaleString()} / {Number(p.umbral_km).toLocaleString()} km
                      <span className="ml-1 font-semibold text-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
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

export function FleetPartsStatus() {
  const [show, setShow] = useState(false);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: getAllUnits,
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Estado Predictivo de Flota
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShow((v) => !v)}>
            {show ? (
              <><ChevronUp className="h-4 w-4 mr-1" />Ocultar</>
            ) : (
              <><ChevronDown className="h-4 w-4 mr-1" />Ver flota ({units.length} unidades)</>
            )}
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
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando unidades...
            </div>
          ) : units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay unidades registradas.</p>
          ) : (
            units.map((u) => <UnitPartsRow key={u.id} unit={u} />)
          )}
        </CardContent>
      )}
    </Card>
  );
}
