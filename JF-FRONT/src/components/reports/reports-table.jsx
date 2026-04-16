"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"
import { FileX } from "lucide-react"

export function ReportsTable() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    makeGetRequest("/reports/maintenances")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {["Unidad", "Tipo", "Estado", "Fecha", "Técnico"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(5).fill(0).map((__, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudo cargar la tabla de reportes.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidad</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Dueño</TableHead>
            <TableHead>Técnico</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center">
                <FileX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-muted-foreground text-sm">No hay mantenimientos registrados</p>
              </TableCell>
            </TableRow>
          ) : (
            reports.map((r) => (
              <TableRow key={r.mantenimiento_id}>
                <TableCell className="font-medium">{r.unidad}</TableCell>
                <TableCell>{r.modelo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.tipo?.toUpperCase() === "PREVENTIVO" ? "outline" : "secondary"}>
                    {r.tipo?.charAt(0).toUpperCase() + r.tipo?.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.estado}</Badge>
                </TableCell>
                <TableCell>
                  {r.fecha_solicitud
                    ? new Date(r.fecha_solicitud).toLocaleDateString("es-PE")
                    : "—"}
                </TableCell>
                <TableCell>{r.dueno_nombre ?? "—"}</TableCell>
                <TableCell>{r.tecnico_nombre ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
