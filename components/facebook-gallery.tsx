"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface FacebookGalleryProps {
  albumUrl: string
}

export function FacebookGallery({ albumUrl }: FacebookGalleryProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const photosPerPage = 10

  const photos = [
  { id: 1, url: "/IMG_1490.JPG" },
  { id: 2, url: "/camera1.jpg" },
  { id: 3, url: "/3b00bc1e-1a3f-4f59-899a-7e71cc316fef.jpeg" },
  { id: 4, url: "/IMG_1491.JPG" },
  { id: 5, url: "/ae2fb699-8c93-4ec9-b1db-009e0002dc12.jpeg" },
  { id: 6, url: "/IMG_1292.JPG" },
  { id: 7, url: "/IMG_1291.JPG" },
  { id: 8, url: "/f9bb4528-cd71-4a86-8baa-c94b4979fe44.jpeg" },
  { id: 9, url: "/IMG_0316.JPG" },
  { id: 10, url: "/camera2.jpg" },
  { id: 11, url: "/IMG_0317.JPG" },
  { id: 12, url: "/7b638d26-ef1a-41ae-b8a3-539ece5c3acb.jpeg" },
  { id: 13, url: "/2a7e512e-6ed5-45ae-a94e-5c33fc9e5c89.jpeg" },
  { id: 14, url: "/094cb8ba-a82f-41a6-9e60-da419b25b57f.jpeg" },
  { id: 15, url: "/camera3.jpg" },
  { id: 16, url: "/741d6215-9b47-4e9e-9a88-2ef8d6e93d92.jpeg" },
  { id: 17, url: "/DE74CB7F-E2CD-4AEA-B03C-9ED9A98C511D.jpg" },
  { id: 18, url: "/e9586cd4-c844-4748-8823-cae366c745e6.jpeg" },
  { id: 19, url: "/a50dde13-89aa-4d51-9ca1-9582184bd24f.jpeg" },
  { id: 20, url: "/IMG_1489.JPG" },
]

  const totalPages = Math.ceil(photos.length / photosPerPage)
  const currentPhotos = photos.slice(currentPage * photosPerPage, (currentPage + 1) * photosPerPage)

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {currentPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square rounded-2xl overflow-hidden glass-light border border-white/20 hover:glass-strong transition-all duration-300 group cursor-pointer"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={photo.url || "/placeholder.svg"}
                alt={`Customer photo ${photo.id}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={currentPage === 0}
          className="rounded-xl glass-light border-white/30 bg-transparent hover:glass disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>

        <div className="flex items-center gap-2">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-all ${currentPage === index ? "bg-pink-400 w-6" : "bg-white/30 hover:bg-white/50"
                }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={currentPage === totalPages - 1}
          className="rounded-xl glass-light border-white/30 bg-transparent hover:glass disabled:opacity-50"
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* View Full Album Button */}
      <div className="text-center pt-4">
        <Button
          size="lg"
          className="rounded-2xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8"
          onClick={() => window.open(albumUrl, "_blank")}
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Xem toàn bộ album trên Facebook
        </Button>
        <p className="text-sm text-foreground/60 mt-3">Hơn {photos.length}+ ảnh từ khách hàng của chúng tôi</p>
      </div>
    </div>
  )
}
