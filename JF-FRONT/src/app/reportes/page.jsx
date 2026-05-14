import dynamic from "next/dynamic"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { ReportsTable } from "@/components/reports/reports-table"
import { ReportsSummary } from "@/components/reports/reports-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
const OwnerReportsSummary = dynamic(
  () => import("@/components/reports/owner-reports-summary").then(m => ({ default: m.OwnerReportsSummary })),
  { loading: () => <Skeleton className="h-40 w-full mt-4" /> }
)
const OwnerReportsTable = dynamic(
  () => import("@/components/reports/owner-reports-table").then(m => ({ default: m.OwnerReportsTable })),
  { loading: () => <Skeleton className="h-60 w-full mt-4" /> }
)

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Visualiza los mantenimientos realizados y sus costos asociados</p>
      </div>
      <ReportsFilters />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="por-dueno">Por Dueño</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <ReportsSummary />
          <ReportsTable />
        </TabsContent>
        <TabsContent value="por-dueno" className="space-y-4">
          <OwnerReportsSummary />
          <OwnerReportsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}

