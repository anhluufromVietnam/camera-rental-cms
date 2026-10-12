"use client"

import { useEffect, useState } from "react"
import { ref, get, set } from "firebase/database"
import { db } from "@/firebase.config"
import { useBranch } from "@/components/branch-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, RefreshCw, Upload, CheckCircle2, CloudDownload, AlertCircle, Loader2, Database } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { syncFromOldFirebase, type SyncProgress, type SyncResult } from "@/lib/firebase-sync"

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

  // Đồng bộ dữ liệu từ Firebase cũ
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncEmail, setSyncEmail] = useState("admin@gmail.com")
  const [syncPassword, setSyncPassword] = useState("123456")
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState("")

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

  const handleSync = async () => {
    if (!syncEmail || !syncPassword) {
      setSyncError("Vui lòng nhập email và mật khẩu Firebase")
      return
    }
    setSyncing(true)
    setSyncError("")
    setSyncResult(null)
    setSyncProgress({ step: "Chuẩn bị đồng bộ...", current: 0, total: 0 })
    try {
      const result = await syncFromOldFirebase(syncEmail, syncPassword, setSyncProgress)
      setSyncResult(result)
      if (result.errors.length > 0) {
        toast({
          title: "Đồng bộ hoàn tất (có lỗi)",
          description: `${result.errors.length} lỗi xảy ra, xem chi tiết trong hộp thoại`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Thành công",
          description: `Đã đồng bộ ${result.cameras} máy ảnh, ${result.bookings.success} đơn hàng`,
        })
      }
    } catch (err: any) {
      setSyncError(err?.message || "Đồng bộ thất bại")
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
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
      <div className="w-full max-w-5xl mx-auto font-[Be_Vietnam_Pro] text-[15px] text-foreground font-semibold px-2 sm:px-4 space-y-6">
        {/* Cài đặt thanh toán */}
        <Card className="w-full border border-border/60 shadow-md rounded-2xl p-4 sm:p-6 space-y-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              ⚙️ Cài đặt thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* QR Image - cột trái */}
              <div className="space-y-3 flex flex-col items-center justify-start rounded-2xl border bg-muted/30 p-4 sm:p-6">
                <Label className="font-medium text-center">Ảnh mã QR thanh toán</Label>
                <div className="w-40 h-40 sm:w-44 sm:h-44 border rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm">
                  {previewUrl || qrUrl ? (
                    <img src={previewUrl || qrUrl} alt="QR" className="object-contain w-full h-full p-2" />
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center">Chưa có ảnh</p>
                  )}
                </div>
                <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />
                <Button onClick={() => document.getElementById("file-upload")?.click()} variant="outline" size="sm" className="flex items-center gap-2 mt-1">
                  <Upload className="h-4 w-4" /> Chọn ảnh QR
                </Button>
              </div>

              {/* Bank Info - cột phải */}
              <div className="w-full space-y-4">
                <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  💳 Thông tin chuyển khoản
                </h4>

                <div className="grid grid-cols-1 gap-3">
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

        {/* Đồng bộ dữ liệu */}
        <Card className="w-full border border-border/60 shadow-md rounded-2xl p-4 sm:p-6 space-y-4">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Đồng bộ dữ liệu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground font-normal">
              Đồng bộ toàn bộ dữ liệu (máy ảnh, đơn hàng, cài đặt) từ Firebase cũ
              <span className="font-mono text-xs"> bookingcamera</span> sang Firebase mới của chi nhánh chính.
              Dữ liệu trùng sẽ được ghi đè bằng dữ liệu mới nhất từ nguồn.
            </p>
            <Button
              onClick={() => {
                setSyncResult(null)
                setSyncError("")
                setSyncDialogOpen(true)
              }}
              disabled={syncing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 font-semibold rounded-xl shadow-md"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <CloudDownload className="h-4 w-4" />
                  Đồng bộ dữ liệu
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={(open) => !syncing && setSyncDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CloudDownload className="h-5 w-5 text-primary" />
              Đồng bộ dữ liệu Firebase
            </DialogTitle>
            <DialogDescription>
              Đăng nhập tài khoản admin trên Firebase mới để bắt đầu đồng bộ từ Firebase cũ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!syncResult && (
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label className="font-bold">Email</Label>
                  <Input
                    type="email"
                    value={syncEmail}
                    onChange={(e) => setSyncEmail(e.target.value)}
                    placeholder="admin@gmail.com"
                    disabled={syncing}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Mật khẩu</Label>
                  <Input
                    type="password"
                    value={syncPassword}
                    onChange={(e) => setSyncPassword(e.target.value)}
                    placeholder="••••••"
                    disabled={syncing}
                  />
                </div>
              </div>
            )}

            {syncProgress && (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {syncProgress.step}
                </p>
                {syncProgress.total > 0 && (
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                    />
                  </div>
                )}
                {syncProgress.total > 0 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {syncProgress.current}/{syncProgress.total} bản ghi
                  </p>
                )}
              </div>
            )}

            {syncError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{syncError}</p>
              </div>
            )}

            {syncResult && (
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Đồng bộ hoàn tất
                </p>
                <p>✅ Máy ảnh: <b>{syncResult.cameras}</b> bản ghi</p>
                <p>✅ Đơn hàng: <b>{syncResult.bookings.success}</b> thành công{syncResult.bookings.error > 0 ? `, ${syncResult.bookings.error} lỗi` : ""}</p>
                <p>✅ Cài đặt: <b>{syncResult.settings ? "Đã đồng bộ" : "Không có dữ liệu"}</b></p>
                <p className="text-xs text-muted-foreground">Chi nhánh chính: {syncResult.mainBranchId}</p>
                {syncResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                    {syncResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setSyncDialogOpen(false)}
              disabled={syncing}
            >
              {syncResult ? "Đóng" : "Hủy"}
            </Button>
            {!syncResult && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đồng bộ...
                  </>
                ) : (
                  <>
                    <CloudDownload className="h-4 w-4" />
                    Bắt đầu đồng bộ
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
