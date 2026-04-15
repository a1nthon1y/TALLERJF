"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bus, Search } from "lucide-react";
import { getMyUnits } from "@/services/unitsService";

export default function DuenoMisUnidadesPage() {
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyUnits()
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = units.filter(
    (u) =>
      u.placa?.toLowerCase().includes(search.toLowerCase()) ||
      u.modelo?.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold tracking-tight">Mis Unidades</h1>
        <p className="text-muted-foreground">
          {units.length} unidad{units.length !== 1 ? "es" : ""} registrada{units.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa o modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Bus className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search ? "No se encontraron unidades con ese criterio." : "No tienes unidades asignadas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{u.placa}</CardTitle>
                  <Badge variant="outline">{u.tipo}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{u.modelo} — {u.año}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kilometraje</span>
                  <span className="font-medium">{u.kilometraje?.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chofer asignado</span>
                  <span className="font-medium">
                    {u.chofer_nombre ?? (
                      <span className="text-yellow-600">Sin asignar</span>
                    )}
                  </span>
                </div>
                {u.chofer_correo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correo chofer</span>
                    <span className="font-medium text-xs">{u.chofer_correo}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
