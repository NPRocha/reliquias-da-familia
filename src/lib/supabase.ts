import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const configurado = Boolean(url && key)

export const supabase = createClient(
  url || 'https://nao-configurado.supabase.co',
  key || 'nao-configurado',
)

export const BUCKET_OBJETOS = 'objetos'
export const BUCKET_INSTITUCIONAL = 'institucional'

/** Cada foto é salva em dois tamanhos: "<id>.webp" (grande) e "<id>_m.webp" (miniatura). */
export function caminhoMiniatura(caminho: string): string {
  return caminho.replace(/(\.\w+)$/, '_m$1')
}

/* ---------------------------------------------------------------------
   Fotos privadas: o site pede endereços temporários (assinados) ao
   Supabase, em lote, e guarda-os por ~55 minutos.
   --------------------------------------------------------------------- */
const VALIDADE_S = 3600
const cacheUrls = new Map<string, { url: string; expira: number }>()
const pendentes = new Map<string, Promise<string | null>>()
const filas = new Map<string, { caminho: string; resolver: (u: string | null) => void }[]>()

export function limparCacheFotos() {
  cacheUrls.clear()
}

async function descarregar(bucket: string) {
  const lote = filas.get(bucket) ?? []
  filas.delete(bucket)
  const caminhos = [...new Set(lote.map((p) => p.caminho))]
  const mapa = new Map<string, string>()
  try {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(caminhos, VALIDADE_S)
    for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) mapa.set(d.path, d.signedUrl)
  } catch {
    /* sem endereço: a foto aparece como "sem foto" */
  }
  for (const p of lote) {
    const k = `${bucket}|${p.caminho}`
    const url = mapa.get(p.caminho) ?? null
    if (url) cacheUrls.set(k, { url, expira: Date.now() + (VALIDADE_S - 300) * 1000 })
    pendentes.delete(k)
    p.resolver(url)
  }
}

/** Endereço temporário de um arquivo privado do Storage (agrupa pedidos simultâneos). */
export function urlAssinada(bucket: string, caminho: string): Promise<string | null> {
  const k = `${bucket}|${caminho}`
  const c = cacheUrls.get(k)
  if (c && c.expira > Date.now()) return Promise.resolve(c.url)
  const p = pendentes.get(k)
  if (p) return p
  const nova = new Promise<string | null>((resolver) => {
    const fila = filas.get(bucket) ?? []
    fila.push({ caminho, resolver })
    filas.set(bucket, fila)
    if (fila.length === 1) setTimeout(() => descarregar(bucket), 0)
  })
  pendentes.set(k, nova)
  return nova
}

/** Traduz erros do banco para mensagens compreensíveis. */
export function mensagemErro(erro: unknown): string {
  const e = erro as { code?: string; message?: string } | null
  if (!e) return 'Erro desconhecido.'
  if (e.code === '23503') return 'Este registro está em uso por outro cadastro e não pode ser excluído.'
  if (e.code === '23505') return 'Já existe um registro com esse valor.'
  if (e.code === '23514') return 'Algum campo tem um valor fora do formato aceito.'
  if (e.code === '42501') return 'Sem permissão para esta operação.'
  if (e.message === 'Invalid login credentials') return 'E-mail ou senha incorretos.'
  if (e.message?.includes('permission denied')) return 'Sem permissão para esta operação.'
  if (e.message?.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet.'
  return e.message || 'Erro desconhecido.'
}
