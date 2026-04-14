"use client";

import { useEffect, useState } from "react";
import { reportService } from "@/services/reportService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MisMantenimientosPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getMyUnitReports().then(data => {
      setReports(data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      pendiente: "warning",
      en_proceso: "info",
      completado: "success",
    };
    return <Badge variant={variants[status]}>{status?.toUpperCase() || ''}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Mantenimientos de mi Unidad</h1>
      <p className="text-muted-foreground">Historial exclusivo de la unidad que tienes actualmente asignada.</p>
      
      {loading ? <p>Cargando historiales...</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Solicitud</TableHead>
                <TableHead>Unidad Confirmada</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.mantenimiento_id}>
                  <TableCell>{new Date(r.fecha_solicitud).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono">{r.unidad}</TableCell>
                  <TableCell>{r.tipo}</TableCell>
                  <TableCell>{getStatusBadge(r.estado)}</TableCell>
                  <TableCell>{r.observaciones}</TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No tienes mantenimientos registrados para la unidad actual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
