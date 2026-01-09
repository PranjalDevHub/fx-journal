export type OcrProgress = {
  status?: string
  progress?: number // 0..1
}

export async function preprocessForOcr(file: File): Promise<Blob> {
  // Basic preprocessing: scale up + grayscale + increase contrast.
  // Helps with small text in screenshots.
  const img = await createImageBitmap(file)
  const scale = 2

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.floor(img.width * scale))
  canvas.height = Math.max(1, Math.floor(img.height * scale))

  const ctx = canvas.getContext("2d")
  if (!ctx) return file

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data

  // grayscale + contrast
  const contrast = 1.15
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b

    // contrast around mid-point 128
    const c = (gray - 128) * contrast + 128
    const v = Math.max(0, Math.min(255, c))

    d[i] = v
    d[i + 1] = v
    d[i + 2] = v
  }

  ctx.putImageData(imageData, 0, 0)

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/png")
  })
}

export async function runOcr(
  image: Blob,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  // dynamic import (client-side)
  const mod: any = await import("tesseract.js")
  const createWorker = mod.createWorker as any

  const logger = (m: any) => {
    if (typeof m?.progress === "number" || m?.status) {
      onProgress?.({ status: m.status, progress: m.progress })
    }
  }

  let worker: any
  try {
    // Try newer signature first
    try {
      worker = await createWorker("eng", 1, { logger })
    } catch {
      // Fallback to classic signature
      worker = await createWorker({ logger })
      await worker.loadLanguage("eng")
      await worker.initialize("eng")
    }

    const result = await worker.recognize(image)
    const text = result?.data?.text ?? ""
    return text
  } finally {
    try {
      await worker?.terminate?.()
    } catch {
      // ignore
    }
  }
}