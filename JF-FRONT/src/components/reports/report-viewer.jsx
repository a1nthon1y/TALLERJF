"use client"

/**
 * Visor universal de reportes.
 *
 * Recibe un `endpoint` (p.ej. "/reports/maintenances"), un set de filtros y
 * renderiza:
 *   - Un panel de filtros (children)
 *   - Una tabla preview con la respuesta JSON del backend
 *   - Botones para descargar el mismo dataset en PDF / Excel
 *
 * El backend devuelve { titulo, subtitulo, columnas, rows, totales }
 * (ver utils/report-export.js); esta UI es 100% data-driven, así que
 * agregar un nuevo reporte solo implica crear el endpoint.
 */
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { FileText, FileSpreadsheet, RefreshCw, FileX, Loader2 } from "lucide-react"
import { makeGetRequest, downloadFile } from "@/utils/api"
import { toast } from "sonner"

const fmtCurrency = (n) =>
  Number.isFinite(Number(n))
    ? `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—"

const fmtNumber = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("es-PE")
    : "—"

const fmtDate = (d) => {
  if (!d) return "—"
  const date = d instanceof Date ? d : new Date(d)
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const fmtCell = (value, type) => {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "currency") return fmtCurrency(value)
  if (type === "number")   return fmtNumber(value)
  if (type === "date")     return fmtDate(value)
  return String(value)
}

const PREVIEW_LIMIT = 50

export function ReportViewer({ endpoint, filters, filtersForm = null }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null) // 'pdf' | 'xlsx' | null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await makeGetRequest(endpoint, { ...filters, formato: "json" })
      setData(res)
    } catch (err) {
      setError(err.message || "Error al cargar el reporte")
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(filters)])

  useEffect(() => { load() }, [load])

  const handleDownload = async (formato) => {
    setDownloading(formato)
    try {
      await downloadFile(endpoint, { ...filters, formato }, `reporte.${formato}`)
      toast.success(`Reporte ${formato.toUpperCase()} descargado`)
    } catch (err) {
      toast.error(err.message || "Error al descargar el reporte")
    } finally {
      setDownloading(null)
    }
  }

  const rows = data?.rows ?? []
  const previewRows = rows.slice(0, PREVIEW_LIMIT)
  const truncated = rows.length > PREVIEW_LIMIT
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <div className="space-y-4">
      {filtersForm}

      {/* Cabecera con metadatos + botones */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-5 w-48 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <>
                <p className="text-base font-semibold leading-tight">{data?.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data?.subtitulo || `${rows.length} registro(s)`}
                  {data?.filtros && Object.keys(data.filtros).length > 0 && (
                    <span className="ml-2 opacity-70">
                      · {Object.entries(data.filtros).map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("pdf")}
              disabled={loading || isEmpty || !!downloading}
              className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {downloading === "pdf"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileText className="h-3.5 w-3.5" />}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("xlsx")}
              disabled={loading || isEmpty || !!downloading}
              className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950/40"
            >
              {downloading === "xlsx"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileSpreadsheet className="h-3.5 w-3.5" />}
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla preview */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <FileX className="h-10 w-10 mx-auto mb-3 text-destructive/40" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : isEmpty ? (
            <div className="p-12 text-center">
              <FileX className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No hay datos que coincidan con los filtros aplicados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columnas.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap">{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r, idx) => (
                  <TableRow key={idx}>
                    {data.columnas.map((c) => (
                      <TableCell
                        key={c.key}
                        className={`whitespace-nowrap ${c.type === "currency" || c.type === "number" ? "tabular-nums" : ""}`}
                      >
                        {c.key === "tipo" || c.key === "estado" ? (
                          <Badge variant="outline" className="text-xs">{fmtCell(r[c.key], c.type)}</Badge>
                        ) : (
                          fmtCell(r[c.key], c.type)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {data.totales && (
                  <TableRow className="bg-muted/50 font-semibold">
                    {data.columnas.map((c, i) => (
                      <TableCell key={c.key} className={`whitespace-nowrap ${c.type === "currency" || c.type === "number" ? "tabular-nums" : ""}`}>
                        {c.key in data.totales
                          ? fmtCell(data.totales[c.key], c.type)
                          : i === 0 ? "TOTAL" : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {truncated && (
          <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground text-center">
            Mostrando primeras {PREVIEW_LIMIT} filas. Descarga el archivo para ver las {rows.length} completas.
          </div>
        )}
      </Card>
    </div>
  )
}
