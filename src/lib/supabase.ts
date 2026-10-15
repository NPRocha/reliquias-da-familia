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

/** URL pública de uma imagem do Storage. */
export function urlImagem(bucket: string, caminho: string | null | undefined): string | null {
  if (!caminho) return null
  return supabase.storage.from(bucket).getPublicUrl(caminho).data.publicUrl
}

/** Cada foto é salva em dois tamanhos: "<id>.webp" (grande) e "<id>_m.webp" (miniatura). */
export function caminhoMiniatura(caminho: string): string {
  return caminho.replace(/(\.\w+)$/, '_m$1')
}

export function urlFoto(caminho: string | null | undefined, miniatura = false): string | null {
  if (!caminho) return null
  return urlImagem(BUCKET_OBJETOS, miniatura ? caminhoMiniatura(caminho) : caminho)
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
  if (e.message?.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet.'
  return e.message || 'Erro desconhecido.'
}
