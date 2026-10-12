import assert from "node:assert/strict"
import test from "node:test"
import { calculateCameraRevenue } from "../lib/camera-revenue.ts"

const now = new Date(2026, 9, 6, 12)
const month = { mode: "quick", quickTime: "month", startDate: "", endDate: "" }
const camera = (id, name = "Canon G7X") => ({ id, name })
const booking = (id, overrides = {}) => ({
  id,
  cameraId: "camera-a",
  cameraName: "Canon G7X",
  totalAmount: 200000,
  status: "completed",
  createdAt: new Date(2026, 9, 3, 10).toISOString(),
  ...overrides,
})

test("separates identical camera names by ID and keeps zero-revenue inventory and historical cameras", () => {
  const result = calculateCameraRevenue([
    booking("one"),
    booking("two", { totalAmount: 100000 }),
    booking("three", { cameraId: "camera-b", totalAmount: 400000 }),
    booking("historical", { cameraId: "deleted-camera", cameraName: "Sony RX100", totalAmount: 50000 }),
  ], [camera("camera-a", "Canon renamed"), camera("camera-b"), camera("unused")], month, now)

  assert.deepEqual(result.cameras.map(({ id, count, total }) => ({ id, count, total })), [
    { id: "camera-b", count: 1, total: 400000 },
    { id: "camera-a", count: 2, total: 300000 },
    { id: "deleted-camera", count: 1, total: 50000 },
    { id: "unused", count: 0, total: 0 },
  ])
  assert.equal(result.cameras.find(row => row.id === "camera-a").name, "Canon renamed")
  assert.equal(result.cameras.find(row => row.id === "deleted-camera").inCatalog, false)
  assert.equal(result.total, 750000)
  assert.equal(result.count, 4)
  assert.equal(result.cameras.reduce((sum, row) => sum + row.total, 0), result.total)
  assert.equal(result.chartData.reduce((sum, row) => sum + row.value, 0), result.total)
})

test("revenue excludes every uncompleted status and invalid or out-of-period dates", () => {
  const result = calculateCameraRevenue([
    ...["pending", "confirmed", "active", "overtime", "cancelled"].map(status => booking(status, { status })),
    booking("last-month", { createdAt: new Date(2026, 8, 30, 23, 59).toISOString() }),
    booking("future", { createdAt: new Date(2026, 9, 7).toISOString() }),
    booking("invalid", { createdAt: "invalid" }),
    booking("valid"),
  ], [camera("camera-a")], month, now)
  assert.equal(result.total, 200000)
  assert.equal(result.count, 1)
})

test("custom dates include both complete local days and sort chart dates across year boundaries", () => {
  const period = { ...month, mode: "custom", startDate: "2025-12-31", endDate: "2026-01-01" }
  const result = calculateCameraRevenue([
    booking("end", { createdAt: new Date(2026, 0, 1, 23, 59, 59, 999).toISOString() }),
    booking("start", { createdAt: new Date(2025, 11, 31, 0, 0, 0).toISOString() }),
    booking("before", { createdAt: new Date(2025, 11, 30, 23, 59, 59, 999).toISOString() }),
    booking("after", { createdAt: new Date(2026, 0, 2, 0, 0, 0).toISOString() }),
  ], [camera("camera-a")], period, now)
  assert.equal(result.count, 2)
  assert.equal(result.total, 400000)
  assert.deepEqual(result.chartData.map(row => row.name), ["31/12/2025", "01/01/2026"])
})

test("open-ended and reversed date ranges are handled explicitly", () => {
  const orders = [booking("order")]
  const inventory = [camera("camera-a")]
  assert.equal(calculateCameraRevenue(orders, inventory, { ...month, mode: "custom" }, now).total, 200000)
  assert.equal(calculateCameraRevenue(orders, inventory, { ...month, mode: "custom", endDate: "2026-10-02" }, now).total, 0)
  const reversed = calculateCameraRevenue(orders, inventory, {
    ...month, mode: "custom", startDate: "2026-10-06", endDate: "2026-10-01",
  }, now)
  assert.equal(reversed.invalidRange, true)
  assert.equal(reversed.total, 0)
})

test("week and year presets respect their boundaries", () => {
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const orders = [
    booking("week-start", { createdAt: lastWeek.toISOString() }),
    booking("just-before-week", { createdAt: new Date(lastWeek.getTime() - 1).toISOString() }),
    booking("year-start", { createdAt: new Date(2026, 0, 1).toISOString() }),
    booking("previous-year", { createdAt: new Date(2025, 11, 31, 23, 59, 59).toISOString() }),
  ]
  assert.equal(calculateCameraRevenue(orders, [], { ...month, quickTime: "week" }, now).count, 1)
  assert.equal(calculateCameraRevenue(orders, [], { ...month, quickTime: "year" }, now).count, 3)
})

test("legacy numeric strings and missing amounts cannot corrupt totals", () => {
  const result = calculateCameraRevenue([
    booking("string", { totalAmount: "150000" }),
    booking("null", { totalAmount: null }),
    booking("invalid", { totalAmount: "bad data" }),
    booking("infinite", { totalAmount: Infinity }),
  ], [], month, now)
  assert.equal(result.total, 150000)
  assert.equal(result.cameras[0].total, 150000)
  assert.equal(result.chartData[0].value, 150000)
})
