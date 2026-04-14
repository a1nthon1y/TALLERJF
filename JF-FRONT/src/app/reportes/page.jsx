import { ReportsFilters } from "@/components/reports/reports-filters"
import { ReportsTable } from "@/components/reports/reports-table"
import { ReportsSummary } from "@/components/reports/reports-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OwnerReportsSummary } from "@/components/reports/owner-reports-summary"

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
        <TabsContent value="general">
          <ReportsSummary />
          <ReportsTable />
        </TabsContent>
        <TabsContent value="por-dueno">
          <OwnerReportsSummary />
        </TabsContent>
      </Tabs>
    </div>
  )
}

