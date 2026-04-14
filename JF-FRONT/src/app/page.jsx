import { Suspense } from "react"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Home() {
  // In a real app, you would check for authentication here
  // If not authenticated, redirect to login
  // const isAuthenticated = checkAuth();
  // if (!isAuthenticated) {
  //   redirect("/login");
  // }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage />
    </Suspense>
  )
}

