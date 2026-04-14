import { OwnerReportsTable } from "@/components/reports/owner-reports-table"
import { OwnerReportsFilters } from "@/components/reports/owner-reports-filters"
import { OwnerReportsSummary } from "@/components/reports/owner-reports-summary"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

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

