import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton({
  // Props personalizables
  title = true,
  action = true,
  rowCount = 5,
  columnCount = 4,
  tableHeight = "600px",
  variant = "table" // 'table' | 'grid' | 'list'
}) {
  // Skeleton para tablas (el más común)
  if (variant === "table") {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-8 w-[200px]" />}
          {action && <Skeleton className="h-10 w-[180px]" />}
        </div>

        {/* Table Section */}
        <div className="rounded-md border">
          {/* Table Header */}
          <div className="border-b bg-gray-50/50 p-4">
            <div className="flex items-center gap-4">
              {Array(columnCount).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-4 w-[100px]" />
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div style={{ height: tableHeight }} className="overflow-auto">
            {Array(rowCount).fill(0).map((_, row) => (
              <div key={row} className="border-b p-4">
                <div className="flex items-center gap-4">
                  {Array(columnCount).fill(0).map((_, cell) => (
                    <Skeleton key={cell} className="h-4 w-[100px]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Skeleton para grids
  if (variant === "grid") {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-8 w-[200px]" />}
          {action && <Skeleton className="h-10 w-[180px]" />}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(rowCount).fill(0).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Skeleton para listas
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && <Skeleton className="h-8 w-[200px]" />}
        {action && <Skeleton className="h-10 w-[180px]" />}
      </div>

      {/* List */}
      <div className="space-y-4">
        {Array(rowCount).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 