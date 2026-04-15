"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { registrarLlegada, getMiUnidad } from "@/services/choferesService";

const formSchema = z.object({
  kilometraje: z.coerce.number().min(0, "Debe ser un número válido"),
  origen: z.string().min(1, "Ruta de origen requerida"),
  comentarios: z.string().optional()
});

export default function ReportarLlegadaPage() {
  const [loading, setLoading] = useState(false);
  const [unidad, setUnidad] = useState(null);
  const [unidadError, setUnidadError] = useState(null);
  const [loadingUnidad, setLoadingUnidad] = useState(true);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kilometraje: 0,
      origen: "",
      comentarios: ""
    }
  });

  useEffect(() => {
    const fetchUnidad = async () => {
      try {
        const data = await getMiUnidad();
        setUnidad(data.unidad);
      } catch (error) {
        setUnidadError(error.message || "No tienes una unidad asignada");
      } finally {
        setLoadingUnidad(false);
      }
    };
    fetchUnidad();
  }, []);

  const onSubmit = async (values) => {
    if (!unidad) {
      toast.error("No tienes una unidad asignada");
      return;
    }
    setLoading(true);
    try {
      const res = await registrarLlegada({ ...values, unidad_id: unidad.id });
      toast.success(res.message || "Llegada registrada exitosamente.");
      if (res.alertasNuevas > 0) {
        toast.warning(`Atención: Se han disparado ${res.alertasNuevas} alertas predictivas para tu unidad.`);
      }
      form.reset();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reportar Llegada a Base</h1>
      <p className="text-muted-foreground">
        Ingresa los datos de tu viaje para mantener el historial y generar mantenimiento predictivo de forma automática.
      </p>

      {/* Unidad asignada */}
      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tu Unidad Asignada</p>
        {loadingUnidad ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : unidadError ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            {unidadError}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-primary" />
            <div>
              <span className="font-bold text-lg">{unidad.placa}</span>
              <span className="text-muted-foreground ml-2 text-sm">{unidad.modelo} {unidad.año}</span>
            </div>
            <span className="ml-auto text-sm font-semibold text-muted-foreground">
              {unidad.kilometraje?.toLocaleString()} km actuales
            </span>
          </div>
        )}
      </div>

      <div className="bg-card p-6 rounded-xl border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="kilometraje" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometraje Actual del Tablero</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={`Ej. ${(unidad?.kilometraje || 0) + 100}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="origen" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruta / Origen</FormLabel>
                  <FormControl><Input placeholder="Ej. Lima" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="comentarios" render={({ field }) => (
              <FormItem>
                <FormLabel>Comentarios / Incidencias (Opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Indica si notaste ruidos extraños, fallas, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={loading || loadingUnidad || !!unidadError}>
              {loading ? "Registrando..." : "Registrar Llegada"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
