import { supabase } from '../supabase'

export const IMAGE_BUCKET = 'food_images'

// Photos are resized and re-encoded in the browser before upload, so a 5 MB
// phone photo is usually stored as 80–250 KB.
export const IMAGE_PRESETS = {
  food: { maxSide: 1000, targetBytes: 220 * 1024 },
  restaurant: { maxSide: 1400, targetBytes: 320 * 1024 },
  category: { maxSide: 600, targetBytes: 120 * 1024 },
  payment: { maxSide: 1600, targetBytes: 250 * 1024 },
}

export const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']

/** Size that fits inside maxSide x maxSide, keeping the aspect ratio (never upscales). */
export function fitWithin(width, height, maxSide) {
  if (!width || !height) return { width: 0, height: 0 }
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Quality steps tried, best first, until the image fits the target size. */
export function qualitySteps() {
  return [0.82, 0.74, 0.66, 0.58, 0.5]
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateImageFile(file) {
  if (!file) return 'Choose a photo first.'
  if (file.type && !ACCEPTED.includes(file.type) && !file.type.startsWith('image/'))
    return 'Please choose a photo (JPG, PNG or WebP).'
  if (file.size > MAX_SOURCE_BYTES) return 'This photo is larger than 15 MB. Please choose a smaller one.'
  return ''
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadWithImageTag(file))
  }
  return loadWithImageTag(file)
}

function loadWithImageTag(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This photo could not be read. Try a JPG or PNG.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Resize + compress a photo. Returns { blob, width, height, type, originalBytes }.
 * Uses WebP when the browser supports it, otherwise JPEG.
 */
export async function compressImage(file, preset = IMAGE_PRESETS.food) {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)

  const bitmap = await loadBitmap(file)
  const sourceWidth = bitmap.width || bitmap.naturalWidth
  const sourceHeight = bitmap.height || bitmap.naturalHeight
  const { width, height } = fitWithin(sourceWidth, sourceHeight, preset.maxSide)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (typeof bitmap.close === 'function') bitmap.close()

  let type = 'image/webp'
  let best = null

  for (const quality of qualitySteps()) {
    let blob = await canvasToBlob(canvas, type, quality)
    if (!blob || (type === 'image/webp' && blob.type !== 'image/webp')) {
      type = 'image/jpeg'
      blob = await canvasToBlob(canvas, type, quality)
    }
    if (!blob) break
    best = blob
    if (blob.size <= preset.targetBytes) break
  }

  if (!best) throw new Error('This photo could not be compressed.')

  return { blob: best, width, height, type, originalBytes: file.size }
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Compress and upload a photo; resolves with { url, bytes, originalBytes }. */
export async function uploadCompressedImage(file, folder = 'food', preset = IMAGE_PRESETS[folder] || IMAGE_PRESETS.food) {
  const { blob, type, originalBytes } = await compressImage(file, preset)
  const extension = type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${folder}/${randomId()}.${extension}`

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, bytes: blob.size, originalBytes }
}
