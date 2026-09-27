"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ref as dbRef, set, get, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, ImageIcon, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GalleryImage {
  id: string
  url: string
  name: string
  uploadedAt: string
}

export function GalleryManagement() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const galleryRef = dbRef(database, "gallery")
      const snapshot = await get(galleryRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        const imageList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))
        setImages(imageList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()))
      }
    } catch (error) {
      console.error("Error loading images:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách ảnh",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i])
      }
      formData.append("folder", "gallery")

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      
      const data = await res.json()
      
      // Save metadata to Realtime Database
      for (let i = 0; i < data.urls.length; i++) {
        const timestamp = Date.now()
        const imageId = `img_${timestamp}_${i}`
        await set(dbRef(database, `gallery/${imageId}`), {
          url: data.urls[i],
          name: files[i].name,
          uploadedAt: new Date().toISOString(),
        })
      }

      toast({
        title: "Thành công",
        description: `Đã upload ${files.length} ảnh`,
      })

      loadImages()
    } catch (error) {
      console.error("Error uploading:", error)
      toast({
        title: "Lỗi",
        description: "Không thể upload ảnh",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Xóa ảnh "${image.name}"?`)) return

    try {
      // Delete from local storage via API
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image.url }),
      })

      // Delete from Database
      await remove(dbRef(database, `gallery/${image.id}`))

      toast({
        title: "Đã xóa",
        description: "Ảnh đã được xóa khỏi gallery",
      })

      loadImages()
    } catch (error) {
      console.error("Error deleting:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa ảnh",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Gallery</h2>
          <p className="text-muted-foreground mt-1">Upload và quản lý ảnh hiển thị trên trang booking</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="upload-images" className="cursor-pointer">
            <div className="glass-strong hover:glass-card px-6 py-3 rounded-xl flex items-center gap-2 transition-all border-2 border-white/30">
              <Upload className="h-5 w-5" />
              <span className="font-medium">{uploading ? "Đang upload..." : "Upload ảnh"}</span>
            </div>
          </Label>
          <Input
            id="upload-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <span className="font-semibold">{images.length} ảnh trong gallery</span>
          </div>
          <a
            href="https://www.facebook.com/media/set?vanity=bbbtranslation&set=a.746067487801116"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Xem album Facebook
          </a>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 glass rounded-xl">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có ảnh nào. Upload ảnh để hiển thị trên trang booking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((image) => (
              <Card
                key={image.id}
                className="glass group overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all"
              >
                <div className="aspect-square relative">
                  <img src={image.url || "/placeholder.svg"} alt={image.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(image)} className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-muted-foreground truncate">{image.name}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
