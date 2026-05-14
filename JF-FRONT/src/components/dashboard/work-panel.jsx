"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ClipboardCheck, Clock, Wrench, UserX, ArrowRight,
  CheckCircle2, AlertCircle, Inbox,
} from "lucide-react"
import { makeGetRequest } from "@/utils/api"

const STATUS_LABEL = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  EN_PROCESO:  { label: "En Proceso",  cls: "bg-blue-100 text-blue-800 border-blue-300" },
  COMPLETADO:  { label: "Completado",  cls: "bg-green-100 text-green-800 border-green-300" },
  CERRADO:     { label: "Cerrado",     cls: "bg-slate-100 text-slate-600 border-slate-300" },
  REALIZADO:   { label: "Resuelto en ruta", cls: "bg-purple-100 text-purple-800 border-purple-300" },
}

function MaintRow({ m }) {
  const s = STATUS_LABEL[m.estado?.toUpperCase()] ?? { label: m.estado, cls: "" }
  const tipo = m.tipo?.toUpperCase()
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{m.placa ?? `U-${m.unidad_id}`}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tipo === "PREVENTIVO" ? "Preventivo" : "Correctivo"}
          {m.tecnico_nombre ? ` · ${m.tecnico_nombre}` : ""}
        </p>
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${s.cls}`}>{s.label}</Badge>
    </div>
  )
}

function Section({ icon: Icon, iconCls, title, subtitle, items, emptyMsg, limit = 4 }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, limit)
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className={`rounded-md p-1.5 ${iconCls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-sm leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">{emptyMsg}</p>
      ) : (
        <>
          {visible.map((m) => <MaintRow key={m.id} m={m} />)}
          {items.length > limit && (
            <button
              className="text-xs text-primary hover:underline mt-1 text-left"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Ver menos" : `Ver ${items.length - limit} más`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function WorkPanel() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    makeGetRequest("/maintenances")
      .then((raw) => {
        const all = Array.isArray(raw) ? raw : []
        setData({
          sinTecnico:  all.filter((m) => ["PENDIENTE", "EN_PROCESO"].includes(m.estado?.toUpperCase()) && !m.tecnico_id),
          enProceso:   all.filter((m) => m.estado?.toUpperCase() === "EN_PROCESO" && m.tecnico_id),
          porAprobar:  all.filter((m) => m.estado?.toUpperCase() === "COMPLETADO"),
          pendientes:  all.filter((m) => m.estado?.toUpperCase() === "PENDIENTE" && m.tecnico_id),
        })
      })
      .catch(() => setData({ sinTecnico: [], enProceso: [], porAprobar: [], pendientes: [] }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </CardContent>
      </Card>
    )
  }

  const total = (data?.sinTecnico.length ?? 0) + (data?.porAprobar.length ?? 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="bg-primary/10 p-1.5 rounded-md">
              <Inbox className="h-5 w-5 text-primary" />
            </span>
            Panel de Trabajo
            {total > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{total} requieren acción</Badge>
            )}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
            <Link href="/mantenimientos">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Section
          icon={UserX}
          iconCls="bg-yellow-100 text-yellow-700"
          title="Sin técnico asignado"
          subtitle="Necesitan asignación"
          items={data?.sinTecnico ?? []}
          emptyMsg="Todos tienen técnico asignado"
        />
        <Section
          icon={Wrench}
          iconCls="bg-blue-100 text-blue-700"
          title="En proceso"
          subtitle="Trabajos activos en taller"
          items={data?.enProceso ?? []}
          emptyMsg="Ningún trabajo en curso"
        />
        <Section
          icon={CheckCircle2}
          iconCls="bg-green-100 text-green-700"
          title="Por aprobar / cerrar"
          subtitle="Trabajo completado"
          items={data?.porAprobar ?? []}
          emptyMsg="Sin trabajos completados"
        />
        <Section
          icon={Clock}
          iconCls="bg-slate-100 text-slate-600"
          title="Programados"
          subtitle="Pendientes con técnico"
          items={data?.pendientes ?? []}
          emptyMsg="Sin trabajos programados"
        />
      </CardContent>
    </Card>
  )
}
