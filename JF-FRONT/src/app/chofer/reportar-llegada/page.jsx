"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { registrarLlegada } from "@/services/choferesService";

const formSchema = z.object({
  unidad_id: z.string().min(1, "Inserta el ID de tu unidad"),
  kilometraje: z.coerce.number().min(0, "Debe ser un número válido"),
  origen: z.string().min(1, "Ruta de origen requerida"),
  comentarios: z.string().optional()
});

export default function ReportarLlegadaPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidad_id: "",
      kilometraje: 0,
      origen: "",
      comentarios: ""
    }
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await registrarLlegada(values);
      toast.success(res.message || "Llegada registrada exitosamente.");
      if (res.alertasNuevas > 0) {
        toast.warning(`Atención: Se han disparado ${res.alertasNuevas} alertas predictivas restrictivas para tu unidad.`);
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
      <p className="text-muted-foreground">Ingresa los datos de tu viaje para mantener el historial y generar mantenimiento predictivo de forma automática.</p>
      
      <div className="bg-card p-6 rounded-xl border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="unidad_id" render={({ field }) => (
              <FormItem>
                <FormLabel>ID Unidad Asignada</FormLabel>
                <FormControl><Input placeholder="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="kilometraje" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometraje Actual</FormLabel>
                  <FormControl><Input type="number" placeholder="Ej. 150000" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="Indica si notaste ruidos extraños, fallas, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Llegada"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
