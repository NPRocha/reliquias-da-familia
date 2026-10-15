import type { Situacao, SituacaoInteresse } from './tipos'

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  ACERVO: 'Acervo da família',
  A_VENDA: 'À venda',
  RESERVADO: 'Reservado',
  VENDIDO: 'Vendido',
}

export const ROTULO_INTERESSE: Record<SituacaoInteresse, string> = {
  NOVO: 'Novo',
  EM_CONTATO: 'Em contato',
  NEGOCIANDO: 'Negociando',
  CONCLUIDO: 'Concluído',
  DESCARTADO: 'Descartado',
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatarValor(v: number | null | undefined): string {
  return v == null ? '' : moeda.format(v)
}

const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export function formatarData(iso: string | null | undefined): string {
  return iso ? data.format(new Date(iso)) : ''
}

export function soDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

/** (85) 99999-0000 a partir de dígitos, com ou sem 55. */
export function formatarTelefone(d: string | null | undefined): string {
  if (!d) return ''
  let n = soDigitos(d)
  if (n.length >= 12 && n.startsWith('55')) n = n.slice(2)
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return d
}

/** Link wa.me. Número brasileiro sem 55 recebe o código do país. */
export function linkWhatsApp(numero: string, texto: string): string {
  let n = soDigitos(numero)
  if (n.length <= 11) n = '55' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

/** Identificação da peça: código da etiqueta ou número interno. */
export function identificacao(o: { codigo: string | null; id: number }): string {
  return o.codigo || `Nº ${String(o.id).padStart(4, '0')}`
}

/** Converte "1.234,56" ou "1234.56" em número; vazio vira null. */
export function lerValor(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? n : null
}
