"use client"

import { useState, useEffect, useMemo } from "react"
import { ref, onValue, update, remove, get } from "firebase/database"
import { db } from "@/firebase.config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Camera,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronRight,
  ArrowUpRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { belongsToBranch, useBranch } from "@/components/branch-context"
import { useToast } from "@/hooks/use-toast"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  cameraId: string
  cameraName: string
  startDate: string
  endDate: string
  totalDays: number
  dailyRate: number
  totalAmount: number
  status: "pending" | "confirmed" | "active" | "completed" | "overtime" | "cancelled"
  createdAt: string
  adminNotes?: string | null
  depositMethod: string
  branchId?: string
}

const STATUS_CONFIG = {
  pending: { label: "Chờ xác nhận", color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50", nextStatus: "confirmed" },
  confirmed: { label: "Đã xác nhận", color: "bg-sky-500", textColor: "text-sky-700", bgColor: "bg-sky-50", nextStatus: "active" },
  active: { label: "Đang thuê", color: "bg-emerald-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50", nextStatus: "completed" },
  completed: { label: "Hoàn thành", color: "bg-slate-500", textColor: "text-slate-700", bgColor: "bg-slate-50", nextStatus: null },
  overtime: { label: "Quá hạn", color: "bg-rose-500", textColor: "text-rose-700", bgColor: "bg-rose-50", nextStatus: null },
  cancelled: { label: "Đã hủy", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50", nextStatus: null },
} as const

export function OrderManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [revenueMode, setRevenueMode] = useState<"quick" | "custom">("quick")
  const [quickTime, setQuickTime] = useState<string>("month")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Booking>>({})
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const { selectedBranchId, mainBranchId } = useBranch()

  const { toast } = useToast()

  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    return onValue(bookingsRef, (snap) => {
      if (snap.exists()) {
        const list: Booking[] = Object.entries(snap.val())
          .map(([id, v]) => ({ id, ...(v as any) }))
          .filter((booking) => belongsToBranch(booking, selectedBranchId, mainBranchId))
        setBookings(list)
      } else setBookings([])
      setLoading(false)
    })
  }, [selectedBranchId, mainBranchId])

  // --- LOGIC XỬ LÝ BIỂU ĐỒ & DOANH THU (ĐÃ SỬA LỖI SẮP XẾP) ---
  const revenueStats = useMemo(() => {
    const completed = bookings.filter(b => b.status === "completed")
    const now = new Date()
    
    const filtered = completed.filter(b => {
      const bDate = new Date(b.createdAt)
      if (revenueMode === "custom") {
        const s = startDate ? new Date(startDate) : null
        const e = endDate ? new Date(endDate) : null
        if (s) s.setHours(0,0,0,0)
        if (e) e.setHours(23,59,59,999)
        return (!s || bDate >= s) && (!e || bDate <= e)
      }
      if (quickTime === "week") return bDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (quickTime === "month") return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear()
      return bDate.getFullYear() === now.getFullYear()
    })

    // Gom nhóm bằng YYYY-MM-DD để sắp xếp thời gian chuẩn xác
    const chartMap = new Map<string, number>()
    filtered.forEach(b => {
      const d = new Date(b.createdAt)
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      chartMap.set(key, (chartMap.get(key) || 0) + b.totalAmount)
    })

    // Sắp xếp theo key (thời gian) rồi mới format sang dd/mm để hiển thị
    const chartData = Array.from(chartMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [y, m, d] = key.split('-')
        return { name: `${d}/${m}`, value }
      })

    return {
      total: filtered.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      count: filtered.length,
      chartData
    }
  }, [bookings, revenueMode, quickTime, startDate, endDate])

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    active: bookings.filter(b => b.status === "active").length,
    completed: bookings.filter(b => b.status === "completed").length,
  }), [bookings])

  const filteredBookings = useMemo(() => {
    let filtered = statusFilter === "all" ? bookings.filter(b => b.status !== "cancelled") : bookings
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(b =>
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.cameraName.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") filtered = filtered.filter(b => b.status === statusFilter)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [bookings, searchTerm, statusFilter])

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    await update(ref(db, `bookings/${id}`), { status })
    toast({ title: "Cập nhật thành công" })
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] p-4 lg:p-8 space-y-8 font-[Be_Vietnam_Pro]">
      
      {/* SECTION 1: DASHBOARD HEADER & CHART (Quyện vào nhau) */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Khối Phân Tích (Trái) */}
        <Card className="flex-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between px-8 pt-8">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Phân tích doanh thu</CardTitle>
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <ArrowUpRight className="h-4 w-4" />
                <span>+12.5% so với tháng trước</span>
              </div>
            </div>
            <div className="flex bg-slate-50 p-1.5 rounded-[20px] border border-slate-100">
              <Button
                variant="ghost"
                className={cn("rounded-[15px] text-xs h-9 px-5 font-bold transition-all", revenueMode === "quick" && "bg-white shadow-sm text-slate-900")}
                onClick={() => setRevenueMode("quick")}
              >Mặc định</Button>
              <Button
                variant="ghost"
                className={cn("rounded-[15px] text-xs h-9 px-5 font-bold transition-all", revenueMode === "custom" && "bg-white shadow-sm text-slate-900")}
                onClick={() => setRevenueMode("custom")}
              >Tùy chỉnh</Button>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-6">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-[1.5px] mb-2 ml-1">Tổng thu nhập</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                    {revenueStats.total.toLocaleString("vi-VN")}
                  </h2>
                  <span className="text-xl font-bold text-slate-300">VNĐ</span>
                </div>
              </div>

              <div className="flex-1 min-w-[240px]">
                {revenueMode === "quick" ? (
                  <Select value={quickTime} onValueChange={setQuickTime}>
                    <SelectTrigger className="w-full h-14 rounded-[22px] border-slate-100 bg-slate-50/50 font-bold px-6 focus:ring-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="week">7 ngày gần nhất</SelectItem>
                      <SelectItem value="month">Trong tháng này</SelectItem>
                      <SelectItem value="year">Trong năm nay</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                    <Input type="date" className="h-14 rounded-[22px] bg-slate-50 border-none font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input type="date" className="h-14 rounded-[22px] bg-slate-50 border-none font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {/* Biểu đồ Recharts */}
            <div className="h-[240px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}}
                    dy={15}
                  />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                    itemStyle={{ fontWeight: 900, color: '#1e293b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Khối Chỉ Số Nhanh (Phải) */}
        <div className="lg:w-[380px] grid grid-cols-2 gap-4">
          {[
            { label: "Tổng đơn", val: stats.total, color: "bg-indigo-600", icon: Package },
            { label: "Chờ duyệt", val: stats.pending, color: "bg-amber-400", icon: Clock },
            { label: "Đang thuê", val: stats.active, color: "bg-emerald-500", icon: Camera },
            { label: "Đã xong", val: stats.completed, color: "bg-slate-900", icon: CheckCircle },
          ].map((s, i) => (
            <Card key={i} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[32px] group hover:scale-[1.02] transition-all cursor-default overflow-hidden">
              <CardContent className="p-6 relative">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg", s.color)}>
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 leading-none">{s.val}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{s.label}</p>
                <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:rotate-12 transition-transform", s.color)} style={{borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%'}}></div>
              </CardContent>
            </Card>
          ))}
          <Card className="col-span-2 border-2 border-dashed border-slate-100 bg-transparent rounded-[32px] flex items-center justify-center p-6 text-slate-400 hover:border-indigo-200 hover:text-indigo-400 transition-all cursor-pointer group">
            <div className="flex flex-col items-center gap-2">
               <TrendingUp className="h-6 w-6 group-hover:bounce" />
               <span className="text-xs font-black uppercase tracking-tighter">Xem báo cáo tăng trưởng</span>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 2: DANH SÁCH ĐƠN HÀNG (Sạch sẽ & Thoáng) */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              className="pl-14 h-16 rounded-[25px] border-none bg-white shadow-[0_4px_15px_rgb(0,0,0,0.02)] font-bold text-slate-700 placeholder:text-slate-300 text-base"
              placeholder="Tìm theo tên khách, máy ảnh hoặc SĐT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-16 rounded-[25px] border-none bg-white shadow-[0_4px_15px_rgb(0,0,0,0.02)] font-black text-slate-700 px-8 min-w-[220px]">
              <Filter className="h-4 w-4 mr-3 text-indigo-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="all">Tất cả (Trừ đã huỷ)</SelectItem>
              <SelectItem value="pending">Chờ xác nhận</SelectItem>
              <SelectItem value="confirmed">Đã xác nhận</SelectItem>
              <SelectItem value="active">Đang thuê</SelectItem>
              <SelectItem value="completed">Đã hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã huỷ đơn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="border-none shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-[30px] overflow-hidden hover:shadow-[0_10px_30px_rgb(0,0,0,0.04)] transition-all bg-white">
              <div className="flex flex-col md:flex-row items-stretch">
                <div className={cn("w-full md:w-2 shrink-0 h-2 md:h-auto", STATUS_CONFIG[booking.status].color)} />
                <div className="flex-1 p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                      {/* Khách hàng */}
                      <div className="flex gap-5">
                        <div className="h-16 w-16 rounded-[24px] bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50">
                          <User className="h-7 w-7 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xl tracking-tight">{booking.customerName}</h4>
                          <p className="text-indigo-600 font-bold text-sm mt-1">{booking.customerPhone}</p>
                          <Badge variant="outline" className="mt-3 text-[10px] font-mono py-0.5 rounded-lg border-slate-100 text-slate-300">ID: {booking.id.slice(0,10)}</Badge>
                        </div>
                      </div>

                      {/* Thông tin thuê */}
                      <div className="flex gap-5">
                        <div className="h-16 w-16 rounded-[24px] bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                          <Camera className="h-7 w-7 text-indigo-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg leading-tight">{booking.cameraName}</h4>
                          <div className="flex items-center gap-2 mt-1.5 text-slate-500">
                             <span className="text-xs font-black uppercase tracking-tighter">
                                {new Date(booking.startDate).toLocaleDateString("vi-VN")} → {new Date(booking.endDate).toLocaleDateString("vi-VN")}
                             </span>
                          </div>
                          <p className="text-[11px] font-bold text-indigo-400 mt-2">{booking.totalDays} ngày • {(booking.dailyRate || 0).toLocaleString()}đ/ngày</p>
                        </div>
                      </div>
                    </div>

                    {/* Tiền & Trạng thái */}
                    <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end border-t lg:border-none pt-6 lg:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[2px] mb-1">Thanh toán</p>
                        <h3 className="text-3xl font-black text-slate-900 leading-none">
                          {(booking.totalAmount || 0).toLocaleString("vi-VN")}<span className="text-sm ml-1 text-slate-400">đ</span>
                        </h3>
                      </div>
                      <Badge className={cn("mt-4 px-6 py-2 rounded-[15px] border-none font-black shadow-none text-[12px] tracking-tight", STATUS_CONFIG[booking.status].bgColor, STATUS_CONFIG[booking.status].textColor)}>
                        {STATUS_CONFIG[booking.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between mt-8 pt-6 border-t border-dashed border-slate-100 gap-4">
                    <div className="flex items-center gap-4">
                       <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Quy trình</span>
                       {STATUS_CONFIG[booking.status].nextStatus && (
                        <Button
                          size="sm" className="rounded-[14px] font-black bg-slate-900 hover:bg-indigo-600 px-6 text-[11px] h-10 transition-all shadow-lg shadow-slate-200"
                          onClick={() => updateBookingStatus(booking.id, STATUS_CONFIG[booking.status].nextStatus as any)}
                        >
                          Chuyển: {STATUS_CONFIG[STATUS_CONFIG[booking.status].nextStatus as any].label}
                          <ChevronRight className="h-3 w-3 ml-2" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-50 text-slate-400" onClick={() => { setEditForm(booking); setSelectedBooking(booking); setIsEditBookingOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-rose-50 text-rose-300 hover:text-rose-500" onClick={() => { setDeleteTargetId(booking.id); setIsDeleteConfirmOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={isEditBookingOpen} onOpenChange={setIsEditBookingOpen}>
        <DialogContent className="sm:max-w-md rounded-[40px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
             <div className="space-y-2">
                <Label className="font-black text-[11px] uppercase text-slate-400 tracking-widest ml-1">Trạng thái hiện tại</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v as any})}>
                   <SelectTrigger className="rounded-[20px] h-14 border-none bg-slate-50 font-bold text-slate-700 focus:ring-2 ring-indigo-100"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {Object.entries(STATUS_CONFIG).map(([k,v]) => <SelectItem key={k} value={k} className="font-bold">{v.label}</SelectItem>)}
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="font-black text-[11px] uppercase text-slate-400 tracking-widest ml-1">Ghi chú nội bộ</Label>
                <Textarea className="rounded-[20px] border-none bg-slate-50 font-medium min-h-[120px] p-4 focus:ring-2 ring-indigo-100" placeholder="Ví dụ: Khách cọc thêm 500k, máy có vết xước nhẹ..." value={editForm.adminNotes || ""} onChange={(e) => setEditForm({...editForm, adminNotes: e.target.value})} />
             </div>
          </div>
          <DialogFooter className="gap-3">
             <Button variant="ghost" onClick={() => setIsEditBookingOpen(false)} className="font-bold rounded-xl text-slate-400">Hủy bỏ</Button>
             <Button className="rounded-[20px] font-black bg-indigo-600 hover:bg-indigo-700 px-10 h-12 shadow-xl shadow-indigo-100 transition-all" onClick={async () => {
                await update(ref(db, `bookings/${selectedBooking?.id}`), editForm);
                setIsEditBookingOpen(false);
                toast({ title: "Đã cập nhật", description: "Dữ liệu đơn hàng đã được đồng bộ." });
             }}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
