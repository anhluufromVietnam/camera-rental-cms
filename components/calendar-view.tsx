"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { ref, onValue, update, push, serverTimestamp } from "firebase/database";
import { db } from "@/firebase.config";
import { belongsToBranch, useBranch } from "@/components/branch-context";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Camera,
  User,
  Phone,
  CheckCircle2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";

/* =========================
   TYPES & CONSTANTS
========================= */

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "overtime" | "cancelled";

interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
    customerEmail?: string; // Thêm dòng này
  cameraName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalAmount?: number;
  status: BookingStatus;
  notes?: string;
  branchId?: string;
}

interface WeekSpanEvent {
  booking: Booking;
  startCol: number;
  endCol: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; text: string; border: string; deviceStatus: string }> = {
  pending: { label: "Chờ xác nhận", color: "bg-[#eab308]", text: "text-[#eab308]", border: "border-[#eab308]", deviceStatus: "Đang đợi duyệt" },
  confirmed: { label: "Đã xác nhận", color: "bg-[#2563eb]", text: "text-[#2563eb]", border: "border-[#2563eb]", deviceStatus: "Đã đặt trước" },
  active: { label: "Đang thuê", color: "bg-[#22c55e]", text: "text-[#22c55e]", border: "border-[#22c55e]", deviceStatus: "Đang sử dụng" },
  completed: { label: "Hoàn thành", color: "bg-[#64748b]", text: "text-[#64748b]", border: "border-[#64748b]", deviceStatus: "Sẵn sàng" },
  overtime: { label: "Quá hạn", color: "bg-[#f97316]", text: "text-[#f97316]", border: "border-[#f97316]", deviceStatus: "Sử dụng quá hạn" },
  cancelled: { label: "Đã hủy", color: "bg-[#ef4444]", text: "text-[#ef4444]", border: "border-[#ef4444]", deviceStatus: "Sẵn sàng" },
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

/* =========================
   HELPERS
========================= */

const normalizeToDate = (d: string | Date) => {
  const x = typeof d === "string" ? parseISO(d) : new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const getWeekSpans = (weekStart: Date, weekEnd: Date, bookings: Booking[]): WeekSpanEvent[] =>
  bookings
    .filter(b => {
      const s = normalizeToDate(b.startDate);
      const e = normalizeToDate(b.endDate);
      return s <= weekEnd && e >= weekStart;
    })
    .map(b => ({
      booking: b,
      startCol: Math.max(0, (normalizeToDate(b.startDate) < weekStart ? weekStart : normalizeToDate(b.startDate)).getDay()),
      endCol: Math.min(6, (normalizeToDate(b.endDate) > weekEnd ? weekEnd : normalizeToDate(b.endDate)).getDay()),
    }));

const packLanes = (events: WeekSpanEvent[]) => {
  const lanes: WeekSpanEvent[][] = [];
  events.forEach(ev => {
    let placed = false;
    for (const lane of lanes) {
      if (lane.every(l => l.endCol < ev.startCol || l.startCol > ev.endCol)) {
        lane.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([ev]);
  });
  return lanes;
};

/* =========================
   COMPONENTS: BOOKING SPAN (MONTH VIEW)
========================= */

const BookingSpan = ({ ev, lane, onClick }: any) => {
  const statusInfo = STATUS_CONFIG[ev.booking.status] || STATUS_CONFIG.pending;
  return (
    <div
      className={cn(
        "absolute h-5 rounded-full px-2 text-[9px] text-white flex items-center shadow-sm cursor-pointer select-none z-10 font-bold border border-white/10 hover:brightness-110 transition-all",
        statusInfo.color
      )}
      style={{
        top: lane * 22,
        left: `${(ev.startCol / 7) * 100}%`,
        width: `${((ev.endCol - ev.startCol + 1) / 7) * 100}%`,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(ev.booking); }}
    >
      <span className="truncate">{ev.booking.customerName} - {ev.booking.cameraName}</span>
    </div>
  );
};

/* =========================
   MAIN VIEW
========================= */

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("day");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const hourRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const { selectedBranchId, mainBranchId } = useBranch();

  useEffect(() => {
    return onValue(ref(db, "bookings"), snap => {
      if (!snap.exists()) return setBookings([]);
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((booking) => belongsToBranch(booking, selectedBranchId, mainBranchId));
      setBookings(list);
    });
  }, [selectedBranchId, mainBranchId]);

  // Auto-scroll đến giờ hiện tại
  useEffect(() => {
    if (viewMode === "day" && isSameDay(currentDate, new Date())) {
      const h = new Date().getHours();
      const target = HOURS.includes(h) ? h : 8;
      setTimeout(() => {
        hourRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [viewMode, currentDate]);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    await update(ref(db, `bookings/${id}`), { status: newStatus });
    await push(ref(db, `bookings/${id}/statusChangeLogs`), { status: newStatus, timestamp: serverTimestamp() });
    setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const weeks = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const start = new Date(y, m, 1);
    start.setDate(start.getDate() - start.getDay());
    const days = Array.from({ length: 42 }, (_, i) => ({ 
      date: addDays(start, i), 
      isCurrentMonth: addDays(start, i).getMonth() === m 
    }));
    const w = [];
    for (let i = 0; i < 42; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    const dS = normalizeToDate(day);
    const dE = new Date(dS); dE.setHours(23, 59, 59);
    return bookings.flatMap(b => {
      const s = normalizeToDate(b.startDate), e = normalizeToDate(b.endDate);
      if (s > dE || e < dS) return [];
      const evs = [];
      if (isSameDay(s, day)) evs.push({ booking: b, type: 'giao', color: STATUS_CONFIG[b.status].color, time: b.startTime || "09:00" });
      if (isSameDay(e, day)) evs.push({ booking: b, type: 'nhan', color: STATUS_CONFIG[b.status].color, time: b.endTime || "18:00" });
      return evs;
    }).sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] md:p-8 p-4 font-sans pb-24 md:pb-8">
      
      {/* HEADER: Native Style */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#E91E63] tracking-tight">
            {format(currentDate, "EEEE, dd/MM", { locale: vi })}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-white text-black shadow-sm border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
               {viewMode === 'day' ? <Smartphone size={12} className="inline mr-1"/> : <Monitor size={12} className="inline mr-1"/>}
               Giao diện {viewMode === 'day' ? 'Ngày' : 'Tháng'}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-[24px] shadow-sm border border-gray-100 w-full md:w-auto">
          <button 
            onClick={() => setViewMode("month")}
            className={cn("flex-1 md:px-6 py-2.5 rounded-[20px] text-xs font-black transition-all", viewMode === "month" ? "bg-[#E91E63] text-white shadow-lg" : "text-gray-400 hover:text-gray-600")}
          >Tháng</button>
          <button 
            onClick={() => setViewMode("day")}
            className={cn("flex-1 md:px-6 py-2.5 rounded-[20px] text-xs font-black transition-all", viewMode === "day" ? "bg-[#E91E63] text-white shadow-lg" : "text-gray-400 hover:text-gray-600")}
          >Ngày</button>
          <div className="w-px h-4 bg-gray-200 mx-2 hidden md:block" />
          <div className="flex gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'month' ? -30 : -1))}><ChevronLeft size={20}/></Button>
            <Button variant="ghost" className="text-[10px] font-black uppercase px-2" onClick={() => setCurrentDate(new Date())}>Hôm nay</Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'month' ? 30 : 1))}><ChevronRight size={20}/></Button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto">
        
        {viewMode === "month" ? (
          /* MONTH VIEW (LANE VIEW) */
          <Card className="overflow-hidden border-none shadow-2xl rounded-[40px] bg-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
            <div className="grid grid-cols-7 bg-muted/20">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">{d}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-100">
              {weeks.map((week, wi) => {
                const ws = normalizeToDate(week[0].date), we = normalizeToDate(week[6].date);
                const lanes = packLanes(getWeekSpans(ws, we, bookings));
                return (
                  <div key={wi} className="relative min-h-[120px]">
                    <div className="grid grid-cols-7 absolute inset-0">
                      {week.map((d, i) => (
                        <div key={i} onClick={() => { setCurrentDate(d.date); setViewMode("day"); }} className={cn(
                          "border-r border-gray-50 p-2 transition-colors hover:bg-gray-50/50 cursor-pointer", 
                          !d.isCurrentMonth && "opacity-20", 
                          isSameDay(d.date, new Date()) && "bg-pink-50/30"
                        )}>
                          <span className={cn(
                            "text-[11px] font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all", 
                            isSameDay(d.date, new Date()) ? "bg-[#E91E63] text-white shadow-lg" : "text-gray-400"
                          )}>{d.date.getDate()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="relative pt-10 pb-2 px-1">
                      <div className="relative" style={{ height: Math.max(lanes.length * 22 + 5, 50) }}>
                        {lanes.map((lane, li) => lane.map((ev: any) => (
                          <BookingSpan key={ev.booking.id + li} ev={ev} lane={li} onClick={setSelectedBooking} />
                        )))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          /* DAY VIEW (TIMELINE) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="lg:col-span-8 border-none shadow-2xl rounded-[40px] bg-white/90 backdrop-blur-xl overflow-hidden flex flex-col h-[650px]">
              <div className="p-6 border-b flex justify-between items-center bg-white/50">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Clock size={18} className="text-[#E91E63]"/> Trục thời gian Live</h3>
                  <Badge variant="outline" className="rounded-full text-[10px] border-green-500 text-green-500 font-bold">Live</Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                  {HOURS.map(h => {
                      const isCurrent = new Date().getHours() === h && isSameDay(currentDate, new Date());
                      const dayEvents = getEventsForDay(currentDate).filter(e => parseInt(e.time?.split(":")[0] || "0") === h);
                      return (
                          <div key={h} ref={el => { hourRefs.current[h] = el }} className={cn("flex gap-6 min-h-[80px] rounded-3xl p-2 transition-all", isCurrent && "bg-pink-50/50")}>
                              <div className="flex flex-col items-center w-12 pt-1">
                                  <span className={cn("text-xs font-black", isCurrent ? "text-[#E91E63]" : "text-gray-300")}>{h}:00</span>
                                  {isCurrent && <div className="w-1.5 h-1.5 bg-[#E91E63] rounded-full mt-1 animate-pulse" />}
                              </div>
                              <div className="flex-1 border-t border-gray-100 pt-3 flex flex-wrap gap-3">
                                  {dayEvents.map((ev: any, idx) => (
                                      <div key={idx} onClick={() => setSelectedBooking(ev.booking)} className={cn("px-5 py-3 rounded-[24px] text-white text-[10px] font-black shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2", ev.color)}>
                                          <Camera size={14}/> {ev.booking.cameraName} - {ev.booking.customerName}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
            </Card>

            <div className="lg:col-span-4 space-y-6">
               <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 px-4">Sự kiện trong ngày</h3>
               <div className="space-y-4">
                 {getEventsForDay(currentDate).length === 0 ? (
                    <div className="bg-white rounded-[35px] p-12 text-center border-2 border-dashed border-gray-100 opacity-50">
                      <p className="font-bold text-xs">Trống lịch trình</p>
                    </div>
                 ) : (
                    getEventsForDay(currentDate).map((ev: any, i) => (
                      <div key={i} onClick={() => setSelectedBooking(ev.booking)} className="bg-white p-5 rounded-[30px] shadow-lg border-l-[8px] hover:shadow-2xl transition-all cursor-pointer group" style={{ borderLeftColor: STATUS_CONFIG[ev.booking.status].color.split('[')[1].split(']')[0] }}>
                         <div className="flex justify-between items-center mb-3">
                           <Badge className={cn("text-[8px] font-black uppercase rounded-full px-3", ev.color)}>{ev.type}</Badge>
                           <span className="text-[10px] font-bold text-gray-400">{ev.time}</span>
                         </div>
                         <h4 className="font-black text-[15px]">{ev.booking.customerName}</h4>
                         <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-2 mt-1"><Camera size={12} className="text-blue-500"/> {ev.booking.cameraName}</p>
                         <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[9px] font-black text-gray-300 uppercase">Máy:</span>
                            <span className={cn("text-[10px] font-black", STATUS_CONFIG[ev.booking.status].text)}>
                              {STATUS_CONFIG[ev.booking.status].deviceStatus}
                            </span>
                         </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          </div>
        )}
      </div>

          {/* MODAL CHI TIẾT: Mobile Native Style */}
          <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
            <DialogContent className="sm:max-w-[450px] rounded-[40px] border-none p-0 overflow-hidden shadow-2xl">
              {selectedBooking && (
                <div className="flex flex-col bg-white">
                  <div className={cn("h-32 p-8 text-white flex flex-col justify-end", STATUS_CONFIG[selectedBooking.status].color)}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Chi tiết đơn thuê</p>
                    <h2 className="text-2xl font-black truncate">{selectedBooking.cameraName}</h2>
                  </div>
                  
                  <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Trạng thái máy */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-[24px]">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Trạng thái thiết bị</p>
                        <p className={cn("text-sm font-black mt-1", STATUS_CONFIG[selectedBooking.status].text)}>
                          {STATUS_CONFIG[selectedBooking.status].deviceStatus}
                        </p>
                      </div>
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm", STATUS_CONFIG[selectedBooking.status].text)}>
                        <Camera size={20}/>
                      </div>
                    </div>

                    {/* Quick Status Update */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cập nhật nhanh đơn hàng</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(key => (
                          <button
                            key={key}
                            onClick={() => handleUpdateStatus(selectedBooking.id, key)}
                            className={cn(
                              "py-3 rounded-[20px] text-[10px] font-black transition-all border-2 flex flex-col items-center gap-1",
                              selectedBooking.status === key
                                ? `${STATUS_CONFIG[key].color} text-white border-transparent shadow-lg scale-105`
                                : "bg-white text-gray-400 border-gray-100 hover:border-pink-200"
                            )}
                          >
                            {selectedBooking.status === key && <CheckCircle2 size={12}/>}
                            {STATUS_CONFIG[key].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gray-50 p-5 rounded-[30px] space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white text-[#E91E63] flex items-center justify-center shadow-sm"><User size={20}/></div>
                        <div>
                          <p className="text-[13px] font-black">{selectedBooking.customerName}</p>
                          <p className="text-[11px] font-bold text-gray-400">{selectedBooking.customerPhone || "Chưa có SĐT"}</p>
                                   {/* CHÈN ĐOẠN HIỂN THỊ EMAIL DƯỚI ĐÂY */}
                                       <p className="text-[13px] font-medium text-gray-500 mt-1 flex items-center gap-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                         {selectedBooking.customerEmail || "Chưa có email/insta"}
                                       </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-sm"><CalendarIcon size={20}/></div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              {format(normalizeToDate(selectedBooking.startDate), "dd/MM")} - {format(normalizeToDate(selectedBooking.endDate), "dd/MM/yyyy")}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full font-medium">
                              {differenceInDays(normalizeToDate(selectedBooking.endDate), normalizeToDate(selectedBooking.startDate)) + 1} ngày
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>Nhận: <span className="font-medium text-foreground">{selectedBooking.startTime || "--:--"}</span></span>
                            <span className="text-gray-300">|</span>
                            <span>Trả: <span className="font-medium text-foreground">{selectedBooking.endTime || "--:--"}</span></span>
                          </p>
                        </div>
                      </div>

                      {/* HIỂN THỊ GHI CHÚ (biến notes từ booking) */}
                      {selectedBooking.notes && (
                        <div className="flex items-start gap-4 pt-3 border-t border-gray-200/50">
                          <div className="w-10 h-10 rounded-2xl bg-white text-blue-500 flex items-center justify-center shadow-sm shrink-0">
                            <Smartphone size={20}/>
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Ghi chú từ khách hàng</p>
                            <p className="text-[12px] font-medium text-gray-600 mt-1 leading-relaxed italic">
                              "{selectedBooking.notes}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Tổng thanh toán</p>
                        <p className="text-2xl font-black text-[#E91E63]">{(selectedBooking.totalAmount || 0).toLocaleString()}đ</p>
                      </div>
                      <Button onClick={() => setSelectedBooking(null)} className="rounded-full px-8 py-6 font-black bg-black text-white hover:bg-gray-800 transition-all">ĐÓNG</Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
    </div>
  );
}
