import { Suspense } from "react"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

// La protección de rutas se aplica vía middleware (cookie auth_token) y
// `Providers` redirige al login si no hay sesión válida — ver middleware.js.
export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  )
}

