"use client"

import { useState } from "react"
import { ref, push, set, update, remove } from "firebase/database"
import { db } from "@/firebase.config"
import { useBranch, type Branch } from "@/components/branch-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  X,
  ChevronDown,
  Store,
  Loader2
} from "lucide-react"

export function BranchManagementDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [manager, setManager] = useState("")
  const [isMain, setIsMain] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const { branches, selectedBranch, selectedBranchId, selectBranch, loading } = useBranch()

  const resetForm = () => {
    setName("")
    setAddress("")
    setPhone("")
    setManager("")
    setIsMain(false)
    setIsAdding(false)
    setEditingId(null)
  }

  const handleStartAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleStartEdit = (branch: Branch) => {
    setEditingId(branch.id)
    setName(branch.name || "")
    setAddress(branch.address || "")
    setPhone(branch.phone || "")
    setManager(branch.manager || "")
    setIsMain(!!branch.isMain)
    setIsAdding(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên chi nhánh",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // If setting this as main branch, reset isMain for other branches
      if (isMain) {
        branches.forEach(async (b) => {
          if (b.id !== editingId && b.isMain) {
            await update(ref(db, `branches/${b.id}`), { isMain: false })
          }
        })
      }

      if (editingId) {
        // Update existing branch
        await update(ref(db, `branches/${editingId}`), {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          manager: manager.trim(),
          isMain,
          updatedAt: Date.now(),
        })
        toast({
          title: "Thành công",
          description: `Đã cập nhật chi nhánh "${name.trim()}"`,
        })
      } else {
        // Add new branch
        const newBranchRef = push(ref(db, "branches"))
        await set(newBranchRef, {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          manager: manager.trim(),
          isMain: isMain || branches.length === 0, // Auto main if first branch
          createdAt: Date.now(),
        })
        toast({
          title: "Thành công",
          description: `Đã thêm chi nhánh "${name.trim()}" mới`,
        })
      }

      resetForm()
    } catch (error: any) {
      toast({
        title: "Lỗi lưu dữ liệu",
        description: error?.message || "Không thể thực hiện thao tác",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, branchName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chi nhánh "${branchName}"?`)) {
      return
    }

    try {
      await remove(ref(db, `branches/${id}`))
      toast({
        title: "Đã xóa",
        description: `Đã xóa chi nhánh "${branchName}"`,
      })
    } catch (error: any) {
      toast({
        title: "Lỗi xóa chi nhánh",
        description: error?.message || "Không thể xóa chi nhánh",
        variant: "destructive",
      })
    }
  }

  const handleSetMain = async (id: string, branchName: string) => {
    try {
      // Unset old main branch
      for (const b of branches) {
        if (b.isMain && b.id !== id) {
          await update(ref(db, `branches/${b.id}`), { isMain: false })
        }
      }
      // Set new main branch
      await update(ref(db, `branches/${id}`), { isMain: true })
      toast({
        title: "Chi nhánh chính",
        description: `Đã đặt "${branchName}" làm chi nhánh chính`,
      })
    } catch (error: any) {
      toast({
        title: "Lỗi cập nhật",
        description: error?.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-xl py-3 px-4 glass hover:glass-strong border-white/30 text-foreground transition-all duration-300 font-medium h-auto"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="max-w-[150px] truncate">{selectedBranch?.name || "Chi nhánh"}</span>
          {branches.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
              {branches.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-0.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 glass-card border-2 border-white/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl z-50"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Quản lý Chi Nhánh
              </h3>
              <p className="text-xs text-muted-foreground">
                {branches.length} chi nhánh đang hoạt động
              </p>
            </div>
          </div>
          {!isAdding && !editingId && (
            <Button
              size="sm"
              onClick={handleStartAdd}
              className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1 shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm mới
            </Button>
          )}
        </div>

        {/* Body content */}
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3">
          {/* Add or Edit Form */}
          {(isAdding || editingId) ? (
            <form onSubmit={handleSave} className="space-y-3 glass p-3.5 rounded-xl border border-white/20">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  {editingId ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingId ? "Sửa thông tin chi nhánh" : "Thêm chi nhánh mới"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-white/10"
                  onClick={resetForm}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div>
                <Label className="text-xs font-medium">Tên chi nhánh *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Chi nhánh Quận 1, Trụ sở HN..."
                  className="h-8 text-xs mt-1 bg-white/10 border-white/20"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Địa chỉ</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Huệ, Q.1, TP.HCM"
                  className="h-8 text-xs mt-1 bg-white/10 border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Số điện thoại</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className="h-8 text-xs mt-1 bg-white/10 border-white/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Quản lý (Tùy chọn)</Label>
                  <Input
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    placeholder="Tên quản lý"
                    className="h-8 text-xs mt-1 bg-white/10 border-white/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMainCheck"
                  checked={isMain}
                  onChange={(e) => setIsMain(e.target.checked)}
                  className="rounded border-white/30 accent-primary h-4 w-4 cursor-pointer"
                />
                <Label htmlFor="isMainCheck" className="text-xs cursor-pointer select-none">
                  Đặt làm Chi Nhánh Chính
                </Label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="h-7 text-xs px-3 border-white/20 bg-transparent hover:bg-white/10"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingId ? "Cập nhật" : "Lưu chi nhánh"}
                </Button>
              </div>
            </form>
          ) : null}

          {/* Branch List */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải danh sách chi nhánh...
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/20 bg-white/5">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">Chưa có chi nhánh nào</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Nhấn vào nút bên dưới để thêm chi nhánh đầu tiên của bạn.
              </p>
              <Button
                size="sm"
                onClick={handleStartAdd}
                className="h-8 px-3 rounded-lg text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm chi nhánh ngay
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    branch.id === selectedBranchId
                      ? "glass-strong border-primary/60 bg-primary/10 shadow-sm"
                      : branch.isMain
                      ? "glass-strong border-primary/40 bg-primary/5 shadow-sm"
                      : "glass border-white/20 hover:border-white/40"
                  }`}
                  onClick={() => selectBranch(branch.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {branch.name}
                        </span>
                        {branch.isMain && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                            <Star className="h-2.5 w-2.5 fill-primary" />
                            Chi nhánh chính
                          </span>
                        )}
                        {branch.id === selectedBranchId && (
                          <span className="text-[10px] font-semibold text-primary">Đang chọn</span>
                        )}
                      </div>

                      {branch.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                          <span className="truncate">{branch.address}</span>
                        </p>
                      )}

                      {branch.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0 text-primary/70" />
                          <span>{branch.phone}</span>
                          {branch.manager && (
                            <span className="text-[11px] opacity-75">({branch.manager})</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!branch.isMain && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Đặt làm chi nhánh chính"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleSetMain(branch.id, branch.name)
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Sửa chi nhánh"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleStartEdit(branch)
                        }}
                        className="h-7 w-7 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Xóa chi nhánh"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDelete(branch.id, branch.name)
                        }}
                        className="h-7 w-7 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
