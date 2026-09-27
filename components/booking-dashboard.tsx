"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Package } from "lucide-react"

import { db } from "@/firebase.config"
import { ref, onValue } from "firebase/database"
import { belongsToBranch, useBranch } from "@/components/branch-context"

/* ================= SAFE HELPERS ================= */

const safeStr = (v: any) => (v ? String(v).toLowerCase() : "")
const safeNum = (v: any) => Number(v || 0)
const safeDate = (v: any) => {
  try { return new Date(v) } catch { return new Date(0) }
}

/* ================= OVERLAP LOGIC ================= */

const isOverlapping = (startA: Date, endA: Date, startB: Date, endB: Date) => {
  return startA <= endB && endA >= startB
}

/* ================= TYPES ================= */

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  cameraName: string
  startDate: string
  endDate: string
  totalAmount: number
  status: string
  createdAt: string
  branchId?: string
}

/* ================= STATUS ================= */

const STATUS_CONFIG: any = {
  pending: { label: "Chờ xác nhận", color: "bg-yellow-500" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-500" },
  active: { label: "Đang thuê", color: "bg-green-500" },
  completed: { label: "Hoàn thành", color: "bg-gray-500" },
  overtime: { label: "Quá hạn", color: "bg-orange-500" },
  cancelled: { label: "Đã hủy", color: "bg-red-500" },
}

/* ================================================= */

export function BookingDashboard() {

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [sortBy, setSortBy] = useState<"created" | "amount" | "start" | "end">("created")

  // filter theo createdAt
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all")

  // 🔥 filter theo khoảng thuê
  const [rentalStart, setRentalStart] = useState("")
  const [rentalEnd, setRentalEnd] = useState("")
  const { selectedBranchId, mainBranchId } = useBranch()

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    const bookingsRef = ref(db, "bookings")

    return onValue(bookingsRef, (snap) => {
      try {
        if (!snap.exists()) {
          setBookings([])
          setLoading(false)
          return
        }

        const list: Booking[] = Object.entries(snap.val()).map(
          ([id, v]: [string, any]) => ({
            id,
            customerName: v?.customerName ?? "Ẩn danh",
            customerEmail: v?.customerEmail ?? "",
            customerPhone: v?.customerPhone ?? "",
            cameraName: v?.cameraName ?? "Không rõ",
            startDate: v?.startDate ?? "",
            endDate: v?.endDate ?? "",
            totalAmount: safeNum(v?.totalAmount),
            status: v?.status ?? "pending",
            createdAt: v?.createdAt ?? new Date().toISOString(),
            branchId: v?.branchId,
          })
        ).filter((booking) => belongsToBranch(booking, selectedBranchId, mainBranchId))

        setBookings(list)
        setLoading(false)

      } catch (err) {
        console.error("Load error:", err)
        setBookings([])
        setLoading(false)
      }
    })
  }, [selectedBranchId, mainBranchId])

  /* ================= FILTER + SORT ================= */

  const processed = useMemo(() => {
    let list = [...bookings]

    const q = safeStr(searchTerm)

    if (q) {
      list = list.filter(b =>
        safeStr(b.customerName).includes(q) ||
        safeStr(b.customerPhone).includes(q) ||
        safeStr(b.cameraName).includes(q)
      )
    }

    if (statusFilter !== "all") {
      list = list.filter(b => b.status === statusFilter)
    } else {
      list = list.filter(b => b.status !== "cancelled")
    }

    // filter theo createdAt
    const now = new Date()

    if (dateRange !== "all") {
      list = list.filter(b => {
        const d = safeDate(b.createdAt)

        if (dateRange === "today")
          return d.toDateString() === now.toDateString()

        if (dateRange === "week")
          return d >= new Date(now.getTime() - 7 * 86400000)

        if (dateRange === "month")
          return d.getMonth() === now.getMonth() &&
                 d.getFullYear() === now.getFullYear()

        return true
      })
    }

    // 🔥 filter theo khoảng thuê (overlap)
    if (rentalStart || rentalEnd) {
      const startF = rentalStart ? new Date(rentalStart) : null
      const endF = rentalEnd ? new Date(rentalEnd) : null

      list = list.filter(b => {
        const start = safeDate(b.startDate)
        const end = safeDate(b.endDate)

        if (startF && endF) return isOverlapping(start, end, startF, endF)
        if (startF) return end >= startF
        if (endF) return start <= endF

        return true
      })
    }

    // sort
    list.sort((a, b) => {
      if (sortBy === "amount") return b.totalAmount - a.totalAmount
      if (sortBy === "start") return safeDate(b.startDate).getTime() - safeDate(a.startDate).getTime()
      if (sortBy === "end") return safeDate(b.endDate).getTime() - safeDate(a.endDate).getTime()
      return safeDate(b.createdAt).getTime() - safeDate(a.createdAt).getTime()
    })

    return list

  }, [bookings, searchTerm, statusFilter, dateRange, rentalStart, rentalEnd, sortBy])

  /* ================= GROUP BY DATE ================= */

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>()

    processed.forEach(b => {
      const key = safeDate(b.createdAt).toISOString().split("T")[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    })

    return Array.from(map.entries()).sort((a, b) =>
      b[0].localeCompare(a[0])
    )
  }, [processed])

  /* ================= STATS ================= */

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    active: bookings.filter(b => b.status === "active").length,
    overtime: bookings.filter(b => b.status === "overtime").length,
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard đơn hàng</h2>
        <p className="text-gray-500 text-sm">Quản lý booking realtime</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent>Tổng: {stats.total}</CardContent></Card>
        <Card><CardContent>Pending: {stats.pending}</CardContent></Card>
        <Card><CardContent>Active: {stats.active}</CardContent></Card>
        <Card><CardContent>Overtime: {stats.overtime}</CardContent></Card>
      </div>

      {/* FILTER */}
      <div className="flex flex-wrap gap-3 items-center">

        <Input
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[200px]"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.keys(STATUS_CONFIG).map(k => (
              <SelectItem key={k} value={k}>
                {STATUS_CONFIG[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v:any)=>setSortBy(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Ngày tạo</SelectItem>
            <SelectItem value="start">Ngày bắt đầu</SelectItem>
            <SelectItem value="end">Ngày kết thúc</SelectItem>
            <SelectItem value="amount">Giá trị</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v:any)=>setDateRange(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Time"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="today">Hôm nay</SelectItem>
            <SelectItem value="week">7 ngày</SelectItem>
            <SelectItem value="month">Tháng</SelectItem>
          </SelectContent>
        </Select>

        {/* 🔥 RENTAL RANGE */}
        <div className="flex gap-2">
          <Input type="date" value={rentalStart} onChange={(e)=>setRentalStart(e.target.value)} />
          <Input type="date" value={rentalEnd} onChange={(e)=>setRentalEnd(e.target.value)} />
        </div>

      </div>

      {/* LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn</CardTitle>
          <CardDescription>{processed.length} đơn</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {grouped.map(([date, list]) => (
            <div key={date}>
              <p className="text-xs text-gray-400 font-bold mb-2">
                {new Date(date).toLocaleDateString("vi-VN")}
              </p>

              {list.map(b => (
                <div key={b.id} className="border p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-semibold">{b.customerName}</p>
                    <p className="text-sm text-gray-500">{b.customerPhone}</p>
                    <p className="text-xs text-gray-400">{b.cameraName}</p>
                    <p className="text-xs mt-1">
                      {b.startDate} → {b.endDate}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">
                      {b.totalAmount.toLocaleString()}đ
                    </p>

                    <Badge className={STATUS_CONFIG[b.status]?.color}>
                      {STATUS_CONFIG[b.status]?.label}
                    </Badge>
                  </div>
                </div>
              ))}

            </div>
          ))}

          {processed.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
              <p className="text-sm text-gray-500">Không có dữ liệu</p>
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  )
}
