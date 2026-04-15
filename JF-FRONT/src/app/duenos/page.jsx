import { OwnersTable } from "@/components/owners/owners-table"

export default function OwnersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dueños de Unidades</h1>
        <p className="text-muted-foreground">Gestiona los dueños de las unidades de transporte</p>
      </div>
      <OwnersTable />
    </div>
  )
}
