"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CameraManagement } from "@/components/camera-management"
import { BookingDashboard } from "@/components/booking-dashboard"
import { CalendarView } from "@/components/calendar-view"
import { OrderManagement } from "@/components/order-management"
import { SettingsImage } from "@/components/settings-image"
import { BranchManagementDropdown } from "@/components/branch-management-dropdown"
import { BranchProvider } from "@/components/branch-context"
import { GalleryManagement } from "@/components/gallery-management"
import { Camera, Calendar, Package, Settings, LogOut, ImageIcon } from "lucide-react"
import { useGlobalErrorLogger } from "@/hooks/useGlobalErrorLogger";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useGlobalErrorLogger();
  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuth")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    } else {
      router.push("/admin/login")
    }
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    router.push("/admin/login")
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setIsScrollingDown(true); // scroll xuống -> ẩn header
      } else {
        setIsScrollingDown(false); // scroll lên -> hiện header
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Đang tải...</h1>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <BranchProvider>
      <div className="min-h-screen">
      <header
        className={`glass-strong border-b-2 border-white/30 sticky top-0 z-50 transition-transform duration-300 ${
          isScrollingDown ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Camera Rental CMS
              </h1>
            </div>

            {/* Right content */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 md:mt-0">
              <span className="text-sm text-foreground/70 font-medium">
                Admin Dashboard
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="glass-light hover:glass border-white/30 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="glass-card rounded-3xl p-6">
          <Tabs defaultValue="cameras" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <TabsList className="grid w-full grid-cols-5 glass p-2 h-auto gap-2 flex-1">
                <TabsTrigger
                  value="cameras"
                  className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Máy ảnh</span>
                </TabsTrigger>
                <TabsTrigger
                  value="bookbook"
                  className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Đơn hàng</span>
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Lịch</span>
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Quản lý</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Cài đặt</span>
                </TabsTrigger>
              </TabsList>
              <div className="shrink-0 flex justify-end">
                <BranchManagementDropdown />
              </div>
            </div>

            <TabsContent value="cameras">
              <CameraManagement />
            </TabsContent>

            <TabsContent value="bookbook">
              <BookingDashboard />
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarView />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsImage />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      </div>
    </BranchProvider>
  )
}
