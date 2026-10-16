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

/** Limites: foto original até 20 MB; arquivo enviado até 500 KB (o banco recusa acima disso). */
export const LIMITE_ORIGINAL = 20 * 1024 * 1024
export const LIMITE_FOTO = 500 * 1024

/** Gera a foto e, se passar do limite, reduz qualidade e depois tamanho até caber. */
async function gerarAte(fonte: ImageBitmap | HTMLImageElement, ladoMax: number, qualidade: number, limite: number): Promise<Blob> {
  let lado = ladoMax
  let q = qualidade
  for (let i = 0; i < 8; i++) {
    const blob = await gerar(fonte, lado, q)
    if (blob.size <= limite) return blob
    if (q > 0.62) q -= 0.08
    else lado = Math.round(lado * 0.85)
  }
  throw new Error('Não foi possível reduzir a foto para 500 KB.')
}

/** Grande: até 1600 px e 500 KB (nítida para reconhecer a peça). Miniatura: até 480 px. */
export async function prepararFoto(arquivo: File): Promise<FotoPreparada> {
  if (!arquivo.type.startsWith('image/')) throw new Error(`"${arquivo.name}" não é uma imagem.`)
  if (arquivo.size > LIMITE_ORIGINAL) throw new Error(`"${arquivo.name}" tem mais de 20 MB. Use uma foto menor.`)
  const fonte = await carregar(arquivo)
  try {
    const grande = await gerarAte(fonte, 1600, 0.82, LIMITE_FOTO)
    const miniatura = await gerarAte(fonte, 480, 0.75, 120 * 1024)
    return { grande, miniatura }
  } finally {
    if ('close' in fonte) fonte.close()
  }
}
