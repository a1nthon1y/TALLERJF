import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function RecentMaintenances() {
  return (
    <div className="space-y-8">
      {recentMaintenances.map((maintenance) => (
        <div key={maintenance.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{maintenance.unit.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{maintenance.unit}</p>
            <p className="text-sm text-muted-foreground">
              {maintenance.type} - {maintenance.date}
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant={maintenance.status === "Pendiente" ? "outline" : "default"}>{maintenance.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

const recentMaintenances = [
  {
    id: "1",
    unit: "ABC-123",
    type: "Preventivo",
    status: "Realizado",
    date: "12/03/2024",
  },
  {
    id: "2",
    unit: "XYZ-789",
    type: "Correctivo",
    status: "Pendiente",
    date: "14/03/2024",
  },
  {
    id: "3",
    unit: "DEF-456",
    type: "Preventivo",
    status: "Realizado",
    date: "15/03/2024",
  },
  {
    id: "4",
    unit: "GHI-101",
    type: "Correctivo",
    status: "Pendiente",
    date: "16/03/2024",
  },
  {
    id: "5",
    unit: "JKL-202",
    type: "Preventivo",
    status: "Realizado",
    date: "18/03/2024",
  },
]

