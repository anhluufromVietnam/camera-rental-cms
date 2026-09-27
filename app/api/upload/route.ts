import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(req: Request) {
  const formData = await req.formData()
  const cameraName = formData.get("cameraName") as string
  const folder = formData.get("folder") as string
  const files = formData.getAll("files") as File[]

  let uploadDir: string
  
  if (folder) {
    // Use folder parameter (e.g., "gallery")
    uploadDir = path.join(process.cwd(), "public", "uploads", folder)
  } else if (cameraName) {
    // Use cameraName for camera images
    uploadDir = path.join(process.cwd(), "public", "uploads", cameraName.replace(/\s+/g, "_"))
  } else {
    uploadDir = path.join(process.cwd(), "public", "uploads", "misc")
  }
  
  fs.mkdirSync(uploadDir, { recursive: true })

  const urls: string[] = []

  for (const file of files) {
    const timestamp = Date.now()
    const ext = path.extname(file.name)
    const baseName = path.basename(file.name, ext).replace(/\s+/g, "_")
    const fileName = `${timestamp}_${baseName}${ext}`
    
    const bytes = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, bytes)
    
    const relativePath = folder 
      ? `/uploads/${folder}/${fileName}`
      : cameraName 
        ? `/uploads/${cameraName.replace(/\s+/g, "_")}/${fileName}`
        : `/uploads/misc/${fileName}`
    urls.push(relativePath)
  }

  return NextResponse.json({ urls })
}

export async function DELETE(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: "Thiếu URL ảnh" }, { status: 400 })

    const fullPath = path.join(process.cwd(), "public", url)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 })
  } catch (err) {
    console.error("Lỗi xóa ảnh:", err)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
