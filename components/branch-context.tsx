"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onValue, ref } from "firebase/database"
import { db } from "@/firebase.config"

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  manager?: string
  isMain?: boolean
  createdAt?: number
}

interface BranchContextValue {
  branches: Branch[]
  selectedBranchId: string | null
  selectedBranch: Branch | null
  mainBranchId: string | null
  loading: boolean
  selectBranch: (branchId: string) => void
}

const BranchContext = createContext<BranchContextValue | null>(null)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedBranchId = window.localStorage.getItem("selectedBranchId")
    if (savedBranchId) setSelectedBranchId(savedBranchId)

    return onValue(ref(db, "branches"), (snapshot) => {
      const data = snapshot.val() || {}
      const list: Branch[] = Object.entries(data).map(([id, value]) => ({
        id,
        ...(value as Omit<Branch, "id">),
      }))

      list.sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)) || a.name.localeCompare(b.name))
      setBranches(list)
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  const mainBranchId = branches.find((branch) => branch.isMain)?.id || branches[0]?.id || null
  const activeBranchId = selectedBranchId && branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : mainBranchId

  const selectBranch = (branchId: string) => {
    setSelectedBranchId(branchId)
    window.localStorage.setItem("selectedBranchId", branchId)
  }

  const value = useMemo(() => ({
    branches,
    selectedBranchId: activeBranchId,
    selectedBranch: branches.find((branch) => branch.id === activeBranchId) || null,
    mainBranchId,
    loading,
    selectBranch,
  }), [branches, activeBranchId, mainBranchId, loading])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) throw new Error("useBranch must be used inside BranchProvider")
  return context
}

export function belongsToBranch(
  item: { branchId?: string },
  selectedBranchId: string | null,
  mainBranchId: string | null,
) {
  if (!selectedBranchId) return true
  return item.branchId ? item.branchId === selectedBranchId : selectedBranchId === mainBranchId
}
