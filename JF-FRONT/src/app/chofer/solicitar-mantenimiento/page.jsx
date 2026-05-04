"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { maintenanceService } from "@/services/maintenanceService";
import { authService } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Bus, ClipboardList, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";

export default function SolicitarMantenimientoPage() {
  const router = useRouter();
  const { unidades, unidad: unit, setUnidad, loading, error } = useMiUnidad();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [procedencia, setProcedencia] = useState("");
  const [requerimientos, setRequerimientos] = useState([""]);
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const addRequerimiento = () => setRequerimientos((prev) => [...prev, ""]);

  const removeRequerimiento = (idx) =>
    setRequerimientos((prev) => prev.filter((_, i) => i !== idx));

  const updateRequerimiento = (idx, value) =>
    setRequerimientos((prev) => prev.map((r, i) => (i === idx ? value : r)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const reqs = requerimientos.filter((r) => r.trim() !== "");
    if (reqs.length === 0) {
      toast.error("Debes agregar al menos un requerimiento");
      return;
    }
    if (!procedencia.trim()) {
      toast.error("Indica la procedencia");
      return;
    }

    const obs = [
      `PROCEDENCIA: ${procedencia.trim()}`,
      "",
      "REQUERIMIENTOS:",
      ...reqs.map((r) => `- ${r}`),
      "",
      "OBSERVACIONES:",
      observaciones.trim() || "Ninguna",
    ].join("\n");

    setSubmitting(true);
    try {
      await maintenanceService.createMaintenance({
        unidad_id: unit.id,
        tipo: "CORRECTIVO",
        kilometraje_actual: unit.kilometraje ?? 0,
        observaciones: obs,
      });
      setSubmitted(true);
      toast.success("Solicitud enviada correctamente");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="list" rowCount={3} action={false} />;
  }

  if (!loading && (error || !unit)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error || "No tienes una unidad asignada."}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">Solicitud enviada</h2>
          <p className="text-muted-foreground mt-1">
            El jefe mecánico recibirá tu solicitud y asignará un técnico.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/chofer/mis-mantenimientos")}>
            Ver mis mantenimientos
          </Button>
          <Button
            onClick={() => {
              setSubmitted(false);
              setProcedencia("");
              setRequerimientos([""]);
              setObservaciones("");
            }}
          >
            Nueva solicitud
          </Button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Solicitud de Mantenimiento
        </h1>
        <p className="text-muted-foreground">
          Completa el formulario para reportar una falla o solicitar revisión
        </p>
      </div>

      {/* Info de unidad y piloto */}
      <Card className="p-4 bg-muted/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-primary" />
            <span className="font-semibold">Datos de la unidad</span>
          </div>
          {unidades.length > 1 && (
            <Select
              value={String(unit.id)}
              onValueChange={(val) => {
                const u = unidades.find((u) => String(u.id) === val);
                if (u) setUnidad(u);
              }}
            >
              <SelectTrigger className="w-52">
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
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <div>
            <p className="text-muted-foreground">Fecha</p>
            <p className="font-medium">{today}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Flota / Placa</p>
            <p className="font-medium">{unit.placa}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Modelo</p>
            <p className="font-medium">{unit.modelo || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kilometraje</p>
            <p className="font-medium">{(unit.kilometraje ?? 0).toLocaleString()} km</p>
          </div>
          <div>
            <p className="text-muted-foreground">Piloto</p>
            <p className="font-medium">{user?.nombre || "—"}</p>
          </div>
        </div>
        <div className="mt-2">
          <Badge variant="outline" className="text-xs">
            Tipo: CORRECTIVO
          </Badge>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Procedencia */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Procedencia <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Ej: Pucallpa, Huancayo, Terminal Norte..."
            value={procedencia}
            onChange={(e) => setProcedencia(e.target.value)}
            required
          />
        </div>

        {/* Requerimientos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Requerimientos <span className="text-destructive">*</span>
            </label>
            <Button type="button" variant="outline" size="sm" onClick={addRequerimiento}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {requerimientos.map((req, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder={`Requerimiento ${idx + 1} — Ej: Fuga de aceite`}
                  value={req}
                  onChange={(e) => updateRequerimiento(idx, e.target.value)}
                />
                {requerimientos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeRequerimiento(idx)}
                    aria-label="Eliminar requerimiento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Mínimo 1 requerimiento</p>
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Observaciones adicionales</label>
          <Textarea
            placeholder="Describe cualquier detalle adicional que el técnico deba saber..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar Solicitud
          </Button>
        </div>
      </form>
    </div>
  );
}
