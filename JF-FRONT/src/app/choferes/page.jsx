"use client"

import { useState } from "react"
import { ChoferesTable } from "@/components/choferes/choferes-table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function ChoferesPage() {
  const [triggerCreate, setTriggerCreate] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Choferes</h1>
          <p className="text-muted-foreground">Gestiona los choferes del sistema</p>
        </div>
        <Button onClick={() => setTriggerCreate((v) => !v)}>
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Registrar Nuevo Chofer
        </Button>
      </div>
      <ChoferesTable externalCreateTrigger={triggerCreate} />
    </div>
  )
}
