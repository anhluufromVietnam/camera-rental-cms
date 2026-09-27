"use client"

import { useEffect, useState } from "react"
import { ref, get, set } from "firebase/database"
import { db } from "@/firebase.config"
import { useBranch } from "@/components/branch-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, RefreshCw, Upload, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

// helper: resize image to reduce size
const resizeImage = (file: File, maxWidth = 500): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const scale = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg", 0.8)
    }
    reader.readAsDataURL(file)
  })
}

export function SettingsImage() {
  const { selectedBranchId, selectedBranch } = useBranch()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successDialog, setSuccessDialog] = useState(false)

  const [qrUrl, setQrUrl] = useState("")
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [paymentSyntax, setPaymentSyntax] = useState("")

  const fetchSettings = async () => {
    try {
      const settingsRef = ref(db, selectedBranchId ? `settings/${selectedBranchId}` : "settings")
      const snapshot = await get(settingsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        setQrUrl(data.qrUrl || "")
        setBankName(data.bankName || "")
        setAccountNumber(data.accountNumber || "")
        setAccountHolder(data.accountHolder || "")
        setPaymentSyntax(data.paymentSyntax || "")
      }
    } catch (err) {
      console.error("Error fetching settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [selectedBranchId])

  // select file (preview only)
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSaveSettings = async () => {
    if (!bankName || !accountNumber || !accountHolder || !paymentSyntax) {
      console.warn("Missing fields, cannot save")
      return
    }

    setSaving(true)
    try {
      let finalQrUrl = qrUrl

      if (qrFile) {
        const compressedBlob = await resizeImage(qrFile)
        const base64 = await blobToBase64(compressedBlob)
        localStorage.setItem("qrImage", base64)
        finalQrUrl = base64
        setQrUrl(finalQrUrl)
      }

      const settingsRef = ref(db, selectedBranchId ? `settings/${selectedBranchId}` : "settings")
      await set(settingsRef, {
        qrUrl: finalQrUrl,
        bankName,
        accountNumber,
        accountHolder,
        paymentSyntax,
      })

      setQrFile(null)
      setPreviewUrl("")
      await fetchSettings()

      setSuccessDialog(true)
      toast({
        title: "Thành công",
        description: `Cài đặt thanh toán của ${selectedBranch?.name || "chi nhánh"} đã được lưu`,
        variant: "default",
      })
    } catch (err) {
      console.error("Error saving settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground font-[Be_Vietnam_Pro] text-[16px] font-semibold">
        Đang tải dữ liệu...
      </div>
    )
  }

  return (
    <>
      <div className="w-full max-w-5xl mx-auto font-[Be_Vietnam_Pro] text-[15px] text-foreground font-semibold px-2 sm:px-4">
        <Card className="w-full border border-border/60 shadow-md rounded-2xl p-4 sm:p-6 space-y-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              ⚙️ Cài đặt thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {/* QR Image */}
            <div className="space-y-2 flex flex-col items-center">
              <Label className="font-medium text-center">Ảnh mã QR thanh toán</Label>
              <div className="w-40 h-40 sm:w-44 sm:h-44 border rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm">
                {previewUrl || qrUrl ? (
                  <img src={previewUrl || qrUrl} alt="QR" className="object-contain w-full h-full p-2" />
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center">Chưa có ảnh</p>
                )}
              </div>
              <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />
              <Button onClick={() => document.getElementById("file-upload")?.click()} variant="outline" size="sm" className="flex items-center gap-2 mt-2">
                <Upload className="h-4 w-4" /> Chọn ảnh QR
              </Button>
            </div>

            {/* Bank Info */}
            <div className="w-full space-y-5 px-2 sm:px-0">
              <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                💳 Thông tin chuyển khoản
              </h4>

              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-2">
                  <Label className="text-blue-900 font-medium font-bold">Ngân hàng</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank" />
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-900 font-medium font-bold">Số tài khoản</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="VD: 0123456789" />
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-900 font-medium font-bold">Chủ tài khoản</Label>
                  <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="VD: CONG TY QUAN LY TOA NHA" />
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-900 font-medium font-bold">Cú pháp chuyển khoản</Label>
                  <Input value={paymentSyntax} onChange={(e) => setPaymentSyntax(e.target.value)} placeholder="VD: Thanh toán [Tên] - [Mã đơn]" />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 font-semibold rounded-xl shadow-md"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu cài đặt
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Success Dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex justify-center items-center gap-2 text-xl">
              <CheckCircle2 className="w-6 h-6" />
              Lưu thành công!
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Cài đặt thanh toán của bạn đã được lưu lại thành công
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center mt-4">
            <Button
              onClick={() => setSuccessDialog(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
