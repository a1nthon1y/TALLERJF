"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function aggregateByMonth(maintenances) {
  const map = {}

  maintenances.forEach(m => {
    const fecha = m.fecha_solicitud ? new Date(m.fecha_solicitud) : null
    if (!fecha) return
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
    const label = `${MESES[fecha.getMonth()]} ${String(fecha.getFullYear()).slice(2)}`
    if (!map[key]) map[key] = { name: label, preventivo: 0, correctivo: 0, _sort: fecha.getFullYear() * 12 + fecha.getMonth() }
    const tipo = m.tipo?.toLowerCase()
    if (tipo === "preventivo") map[key].preventivo++
    else if (tipo === "correctivo") map[key].correctivo++
  })

  return Object.values(map)
    .sort((a, b) => a._sort - b._sort)
    .slice(-6) // últimos 6 meses
    .map(({ _sort, ...rest }) => rest)
}

export function Overview() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    makeGetRequest("/maintenances")
      .then(raw => setData(Array.isArray(raw) ? aggregateByMonth(raw) : []))
      .catch(() => { setError(true); setData([]) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Skeleton className="h-[350px] w-full" />
  }

  if (error) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <p className="text-sm text-destructive">No se pudo cargar el gráfico de mantenimientos.</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
        No hay datos de mantenimientos para mostrar.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [value, name === "preventivo" ? "Preventivo" : "Correctivo"]}
        />
        <Legend formatter={(value) => value === "preventivo" ? "Preventivo" : "Correctivo"} />
        <Bar dataKey="preventivo" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="correctivo" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
