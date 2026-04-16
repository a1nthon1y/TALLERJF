"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { FileX } from "lucide-react"

export function OwnerReportsSummary() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    makeGetRequest("/reports/maintenances")
      .then((rows) => {
        if (!Array.isArray(rows)) { setData([]); return }
        // Aggregate by owner
        const map = {}
        rows.forEach((r) => {
          const key = r.dueno_nombre ?? "Sin dueño"
          if (!map[key]) map[key] = { name: key, preventivo: 0, correctivo: 0, total: 0 }
          const tipo = r.tipo?.toUpperCase()
          if (tipo === "PREVENTIVO") map[key].preventivo++
          else if (tipo === "CORRECTIVO") map[key].correctivo++
          map[key].total++
        })
        setData(Object.values(map).sort((a, b) => b.total - a.total))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-40" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mt-4">
        No se pudo cargar el reporte por dueño.
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 mt-4">
        <FileX className="h-12 w-12 opacity-30" aria-hidden="true" />
        <p className="text-sm">No hay mantenimientos registrados para mostrar.</p>
      </div>
    )
  }

  const totalMaints = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mantenimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaints}</div>
            <p className="text-xs text-muted-foreground">
              {data.length} dueño(s) con actividad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dueño más activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{data[0]?.name}</div>
            <p className="text-xs text-muted-foreground">{data[0]?.total} mantenimientos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mantenimientos por Dueño</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ width: 80 }}
              />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend formatter={(v) => (v === "preventivo" ? "Preventivo" : "Correctivo")} />
              <Bar dataKey="preventivo" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="correctivo" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
