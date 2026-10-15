/** Redimensiona e converte a foto para WebP no próprio navegador, antes do envio. */

async function carregar(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    } catch {
      /* segue para o método alternativo */
    }
  }
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function gerar(fonte: ImageBitmap | HTMLImageElement, ladoMax: number, qualidade: number): Promise<Blob> {
  const w = 'naturalWidth' in fonte ? fonte.naturalWidth : fonte.width
  const h = 'naturalHeight' in fonte ? fonte.naturalHeight : fonte.height
  const escala = Math.min(1, ladoMax / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * escala)
  canvas.height = Math.round(h * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Navegador sem suporte a processamento de imagem.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', qualidade))
  if (!blob || blob.type !== 'image/webp') {
    const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', qualidade))
    if (!jpeg) throw new Error('Não foi possível converter a imagem.')
    return jpeg
  }
  return blob
}

export interface FotoPreparada {
  grande: Blob
  miniatura: Blob
}

/** Grande: até 1600 px (~200–400 KB). Miniatura: até 480 px (~30–60 KB). */
export async function prepararFoto(arquivo: File): Promise<FotoPreparada> {
  if (!arquivo.type.startsWith('image/')) throw new Error(`"${arquivo.name}" não é uma imagem.`)
  const fonte = await carregar(arquivo)
  const grande = await gerar(fonte, 1600, 0.82)
  const miniatura = await gerar(fonte, 480, 0.75)
  if ('close' in fonte) fonte.close()
  return { grande, miniatura }
}
