"use client"

import { ChoferesTable } from "@/components/choferes/choferes-table"

export default function ChoferesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choferes</h1>
        <p className="text-muted-foreground">Gestiona los choferes del sistema</p>
      </div>
      <ChoferesTable />
    </div>
  )
}
