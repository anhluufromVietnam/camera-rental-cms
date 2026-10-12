"use client"
import { useState, useEffect } from "react"
import { PublicBooking } from "@/components/public-booking"
import { Camera, Heart, Star, Phone, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FacebookGallery } from "@/components/facebook-gallery"
import { useGlobalErrorLogger } from "@/hooks/useGlobalErrorLogger";

export default function BookingPage() {
  useGlobalErrorLogger();
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // State mới cho mobile menu

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Ẩn header khi scroll xuống, hiện khi scroll lên
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowHeader(false)
        setIsMobileMenuOpen(false) // Tự động đóng menu khi scroll
      } else {
        setShowHeader(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  // Component con hiển thị Social Icons để tái sử dụng
  const SocialIcons = () => (
    <div className="flex items-center gap-4">
      <a
        href="https://www.facebook.com/minhthu.nguyentran.37266"
        target="_blank"
        className="hover:scale-110 transition-transform text-pink-500"
      >
        <img
          src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg"
          alt="Facebook"
          className="w-8 h-8 sm:w-10 sm:h-10 opacity-90 hover:opacity-100"
        />
      </a>
      <a
        href="https://www.instagram.com/chupchoet.digicam"
        target="_blank"
        className="hover:scale-110 transition-transform"
      >
        <img
          src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg"
          alt="Instagram"
          className="w-8 h-8 sm:w-10 sm:h-10 opacity-90 hover:opacity-100"
        />
      </a>
      <a
        href="https://www.tiktok.com/@chupchoet.digicam"
        target="_blank"
        className="hover:scale-110 transition-transform"
      >
        <img
          src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg"
          alt="TikTok"
          className="w-8 h-8 sm:w-10 sm:h-10 opacity-90 hover:opacity-100"
        />
      </a>
    </div>
  )

  return (
    <div className="min-h-screen">
      <header
        className={`glass-strong fixed top-0 left-0 w-full z-50 border-b border-white/20 transition-transform duration-300 ${showHeader ? "translate-y-0" : "-translate-y-full"
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          {/* Main Header Row: Luôn hiển thị Logo bên trái, Desktop Menu hoặc Mobile Toggle bên phải */}
          <div className="flex items-center justify-between">

            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 backdrop-blur-sm">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight">
                  chupchoet.digicam
                </h1>
                <p className="text-[10px] sm:text-sm text-foreground/60">Camera Rental</p>
              </div>
            </div>

            {/* Desktop Navigation (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-8">
              <a className="flex items-center gap-2 hover:text-pink-400 transition-colors font-medium">
                <Phone size={20} className="text-pink-400" />
                <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  0369399740
                </span>
              </a>
              <SocialIcons />
            </div>

            {/* Mobile Menu Button (Visible on Mobile only) */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-foreground hover:bg-pink-100/20"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown (Hiển thị khi state open) */}
          {isMobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 border-t border-white/10 mt-4 animate-in slide-in-from-top-2 fade-in-20">
              <div className="flex flex-col items-center gap-4 space-y-2">
                <a className="flex items-center gap-2 p-2 rounded-lg bg-white/40 w-full justify-center">
                  <Phone size={20} className="text-pink-500" />
                  <span className="text-lg font-bold text-foreground">
                    Hotline: 0369399740
                  </span>
                </a>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-foreground/60">Theo dõi chúng tôi tại:</span>
                  <SocialIcons />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <section id="booking-section" className="pb-20 pt-28 sm:pt-32 scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <PublicBooking />
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent via-pink-500/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Những khoảnh khắc đẹp từ khách hàng
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-lg text-foreground/70">
              Hơn 500+ khách hàng đã tin tưởng và tạo ra những bức ảnh tuyệt vời
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <FacebookGallery albumUrl="https://www.instagram.com/chupchoet.digicam" />
          </div>
        </div>
      </section>

      <section id="story-section" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Câu chuyện của chúng tôi
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-lg text-foreground/70">
                Khởi nguồn từ niềm đam mê nhiếp ảnh và mong muốn chia sẻ
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6 sm:p-8 md:p-12 space-y-6 border border-white/20">
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                <span className="text-2xl text-pink-400 font-serif">"</span>
                Từ niềm đam mê với nhiếp ảnh và khát khao lan tỏa cảm hứng sáng tạo, chúng mình đã quyết định đầu tư hàng trăm triệu đồng cho những chiếc máy ảnh Fujifilm chất lượng cao, để ai cũng có thể chạm đến trải nghiệm chụp ảnh chuyên nghiệp — chỉ từ 100k.
              </p>

              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                Chúng mình hiểu cảm giác phân vân khi muốn mua máy nhưng sợ ít dùng, nên #chupchoet.digicam ra đời để bạn có thể trải nghiệm nhiều dòng máy khác nhau, khám phá góc nhìn mới, mà chi phí chỉ bằng vài ly trà sữa.
              </p>

              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                Không chỉ cho thuê thiết bị, chúng mình còn muốn đồng hành cùng bạn trong từng khung hình:
                💫 Tặng preset màu độc quyền giúp ảnh có hồn hơn
                🤝 Hỗ trợ tận tình từ khi nhận máy đến lúc trả
                🎒 Phụ kiện đầy đủ từ A–Z, để bạn chỉ việc mang theo niềm cảm hứng và bắt đầu kể câu chuyện của riêng mình qua ống kính.
                <span className="text-2xl text-pink-400 font-serif">"</span>
              </p>

              <div className="pt-6 border-t border-white/20">
                <p className="text-foreground/60 italic">- Minh Thư, Founder & Creative Director</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Khách hàng nói gì về chúng tôi
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-lg text-foreground/70">
              Những phản hồi chân thực từ khách hàng đã sử dụng dịch vụ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Lan Anh",
                role: "Content Creator",
                content:
                  "Máy ảnh chất lượng tuyệt vời, giá cả hợp lý. Chị chủ rất nhiệt tình hướng dẫn mình sử dụng. Mình đã có những bức ảnh du lịch Đà Lạt cực đẹp!",
                rating: 5,
              },
              {
                name: "Thu Hà",
                role: "Cô dâu mới",
                content:
                  "Thuê máy cho đám cưới của mình, dịch vụ chuyên nghiệp lắm. Giao nhận đúng giờ, máy móc mới tinh. Cảm ơn team đã giúp mình có những khoảnh khắc đẹp nhất!",
                rating: 5,
              },
              {
                name: "Phương Anh",
                role: "Nhiếp ảnh nghiệp dư",
                content:
                  "Lần đầu thuê máy ảnh chuyên nghiệp, mình hơi lo lắng nhưng chị tư vấn rất kỹ. Máy chụp ảnh chân dung đẹp xuất sắc!",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="glass-card rounded-3xl p-6 space-y-4 border border-white/20 hover:glass-strong transition-all"
              >
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">"{testimonial.content}"</p>
                <div className="pt-4 border-t border-white/20">
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm sm:text-base text-foreground/60">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 backdrop-blur-sm">
                <Camera className="h-8 w-8 text-pink-500" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  chupchoet.digicam
                </h3>
                <p className="text-sm sm:text-base text-foreground/60">Camera Rental</p>
              </div>
            </div>

            <p className="text-base sm:text-lg text-foreground/70">
              Ghi lại những khoảnh khắc đẹp nhất của bạn với thiết bị chuyên nghiệp
            </p>

            <p className="text-sm sm:text-base text-foreground/50 pt-6">
              © 2025 chupchoet.digicam. Made with <Heart className="inline h-4 w-4 text-pink-400" /> for photography lovers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
