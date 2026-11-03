// Shrink phone photos before upload: max 900px, WebP (JPEG fallback). Keeps data use low.
export async function compress(file, max = 900, quality = 0.78) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const toBlob = (type) => new Promise((res) => c.toBlob(res, type, quality))
  const webp = await toBlob('image/webp')
  return webp && webp.type === 'image/webp' ? webp : await toBlob('image/jpeg')
}
