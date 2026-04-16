import dynamic from "next/dynamic"
import { OwnerReportsTable } from "@/components/reports/owner-reports-table"
import { OwnerReportsFilters } from "@/components/reports/owner-reports-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
const OwnerReportsSummary = dynamic(
  () => import("@/components/reports/owner-reports-summary").then(m => ({ default: m.OwnerReportsSummary })),
  { loading: () => <Skeleton className="h-40 w-full mt-4" /> }
)

export default function OwnerReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reportes">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Reportes
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes por Dueño</h1>
        <p className="text-muted-foreground">Análisis de mantenimientos y costos por dueño de unidades</p>
      </div>

      <OwnerReportsFilters />
      <OwnerReportsSummary />
      <OwnerReportsTable />
    </div>
  )
}

