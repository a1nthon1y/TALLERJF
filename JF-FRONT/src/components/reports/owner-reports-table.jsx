"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"
import { FileX } from "lucide-react"

export function OwnerReportsTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    makeGetRequest("/reports/maintenances")
      .then((data) => {
        if (!Array.isArray(data)) { setRows([]); return }
        // Aggregate per owner
        const map = {}
        data.forEach((r) => {
          const key = r.dueno_nombre ?? "Sin dueño"
          if (!map[key]) map[key] = { owner: key, total: 0, preventivo: 0, correctivo: 0, unidades: new Set() }
          const tipo = r.tipo?.toUpperCase()
          if (tipo === "PREVENTIVO") map[key].preventivo++
          else if (tipo === "CORRECTIVO") map[key].correctivo++
          map[key].total++
          if (r.unidad) map[key].unidades.add(r.unidad)
        })
        setRows(
          Object.values(map)
            .map((v) => ({ ...v, unidades: v.unidades.size }))
            .sort((a, b) => b.total - a.total)
        )
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter((r) =>
    r.owner.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {["Dueño", "Unidades", "Total", "Preventivos", "Correctivos"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(4).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(5).fill(0).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudo cargar el reporte por dueño.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre de dueño..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          aria-label="Buscar dueño"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dueño</TableHead>
              <TableHead>Unidades distintas</TableHead>
              <TableHead>Total mantenimientos</TableHead>
              <TableHead>Preventivos</TableHead>
              <TableHead>Correctivos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <FileX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? "Sin resultados para esa búsqueda" : "No hay datos de mantenimientos registrados"}
                  </p>
                </TableCell>
              </TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.owner}>
                <TableCell className="font-medium">{r.owner}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.unidades}</Badge>
                </TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-blue-300 text-blue-600 dark:text-blue-400">
                    {r.preventivo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-red-300 text-red-600 dark:text-red-400">
                    {r.correctivo}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
