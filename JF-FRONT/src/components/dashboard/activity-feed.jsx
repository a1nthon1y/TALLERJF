import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bus, Wrench, Package, User, Clock } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"

// Datos de ejemplo para la actividad reciente
const activityData = [
  {
    id: 1,
    user: {
      name: "Juan Pérez",
      role: "Técnico"
    },
    action: "completó el mantenimiento",
    target: "ABC-123",
    targetType: "unit",
    time: "Hace 10 minutos",
  },
  {
    id: 2,
    user: {
      name: "Ana Martínez",
      role: "Almacenista"
    },
    action: "actualizó el stock de",
    target: "Filtro de aceite",
    targetType: "material",
    time: "Hace 30 minutos",
  },
  {
    id: 3,
    user: {
      name: "Carlos Rodríguez",
      role: "Técnico"
    },
    action: "programó mantenimiento para",
    target: "XYZ-789",
    targetType: "unit",
    time: "Hace 1 hora",
  },
  {
    id: 4,
    user: {
      name: "María López",
      role: "Técnico"
    },
    action: "registró nueva unidad",
    target: "JKL-202",
    targetType: "unit",
    time: "Hace 2 horas",
  },
  {
    id: 5,
    user: {
      name: "Luis Gómez",
      role: "Almacenista"
    },
    action: "agregó nuevo material",
    target: "Líquido de frenos",
    targetType: "material",
    time: "Hace 3 horas",
  },
]

export function ActivityFeed() {
  const getActivityIcon = (type) => {
    switch (type) {
      case "unit":
        return <Bus className="h-4 w-4 text-blue-500" />
      case "maintenance":
        return <Wrench className="h-4 w-4 text-green-500" />
      case "material":
        return <Package className="h-4 w-4 text-red-500" />
      case "user":
        return <User className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <span className="bg-primary/10 p-1.5 rounded-md mr-2">
            <Clock className="h-5 w-5 text-primary" />
          </span>
          Actividad Reciente
        </CardTitle>
        <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activityData.map((activity) => (
            <div key={activity.id} className="flex">
              <UserAvatar 
                user={activity.user}
                variant="activity"
                className="h-9 w-9 border-2 border-primary/20"
              />
              <div className="ml-4 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span> {activity.action}{" "}
                  <span className="font-medium flex items-center inline-flex">
                    {getActivityIcon(activity.targetType)}
                    <span className="ml-1">{activity.target}</span>
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <a href="/actividad" className="text-sm text-primary hover:underline">
            Ver todo el historial de actividad →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

