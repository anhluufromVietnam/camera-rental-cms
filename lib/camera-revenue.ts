export interface RevenueBooking {
  id: string
  cameraId: string
  cameraName: string
  totalAmount: number | string | null
  status: string
  createdAt: string
}

export interface RevenueCamera {
  id: string
  name: string
  branchId?: string
}

export interface RevenuePeriod {
  mode: "quick" | "custom"
  quickTime: string
  startDate: string
  endDate: string
}

// Both inputs must be scoped to the selected branch by the caller.
// Revenue follows the existing report: completed orders, grouped by creation date.
export function calculateCameraRevenue(
  bookings: RevenueBooking[],
  cameras: RevenueCamera[],
  period: RevenuePeriod,
  now = new Date(),
) {
  let start: Date | null = null
  let end: Date | null = null

  if (period.mode === "custom") {
    start = period.startDate ? new Date(`${period.startDate}T00:00:00`) : null
    end = period.endDate ? new Date(`${period.endDate}T23:59:59.999`) : null
  } else {
    end = now
    if (period.quickTime === "week") start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (period.quickTime === "month") start = new Date(now.getFullYear(), now.getMonth(), 1)
    else start = new Date(now.getFullYear(), 0, 1)
  }

  const invalidRange = Boolean(
    (start && !Number.isFinite(start.getTime())) ||
    (end && !Number.isFinite(end.getTime())) ||
    (start && end && start > end),
  )
  const byCamera = new Map(cameras.map(camera => [camera.id, {
    id: camera.id,
    name: camera.name,
    inCatalog: true,
    count: 0,
    total: 0,
  }]))
  const chartMap = new Map<string, number>()
  let total = 0
  let count = 0

  for (const booking of bookings) {
    const date = new Date(booking.createdAt)
    if (
      invalidRange || booking.status !== "completed" || !Number.isFinite(date.getTime()) ||
      (start && date < start) || (end && date > end)
    ) continue

    const parsedAmount = Number(booking.totalAmount)
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0
    const cameraId = booking.cameraId || "unknown-camera"
    const camera = byCamera.get(cameraId) || {
      id: cameraId,
      name: booking.cameraId ? (booking.cameraName || "Máy ảnh không còn trong danh mục") : "Không xác định máy ảnh",
      inCatalog: false,
      count: 0,
      total: 0,
    }
    camera.count += 1
    camera.total += amount
    byCamera.set(cameraId, camera)
    total += amount
    count += 1

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    chartMap.set(key, (chartMap.get(key) || 0) + amount)
  }

  return {
    total,
    count,
    invalidRange,
    cameras: Array.from(byCamera.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id)),
    chartData: Array.from(chartMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [year, month, day] = key.split("-")
        return { name: `${day}/${month}/${year}`, value }
      }),
  }
}
