import { useCallback, useEffect, useRef, useState, type DependencyList, type ReactNode } from 'react'
import { ROTULO_SITUACAO } from '../lib/formato'
import { BUCKET_OBJETOS, caminhoMiniatura, urlAssinada } from '../lib/supabase'
import type { Situacao } from '../lib/tipos'

export function Etiqueta({ texto, grande = false }: { texto: string; grande?: boolean }) {
  return <span className={grande ? 'etiqueta etiqueta--grande' : 'etiqueta'}>{texto}</span>
}

/** Carimbo só aparece para situações comerciais; "Acervo" não é carimbado. */
export function Carimbo({ situacao, grande = false }: { situacao: Situacao; grande?: boolean }) {
  if (situacao === 'ACERVO') return null
  return (
    <span className={`carimbo carimbo--${situacao}${grande ? ' carimbo--grande' : ''}`}>
      {ROTULO_SITUACAO[situacao]}
    </span>
  )
}

/** Endereço temporário de uma foto privada (undefined enquanto carrega). */
export function useUrlFoto(caminho: string | null | undefined, bucket = BUCKET_OBJETOS): string | null | undefined {
  const [url, setUrl] = useState<{ de: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!caminho) return
    let ativo = true
    urlAssinada(bucket, caminho).then((u) => ativo && setUrl({ de: caminho, url: u }))
    return () => {
      ativo = false
    }
  }, [bucket, caminho])
  if (!caminho) return null
  return url?.de === caminho ? url.url : undefined
}

interface FotoProps {
  /** Caminho do arquivo no Storage (bucket "objetos" por padrão). */
  caminho: string | null | undefined
  alt: string
  miniatura?: boolean
  bucket?: string
  className?: string
}

export function Foto({ caminho, alt, miniatura = false, bucket = BUCKET_OBJETOS, className = '' }: FotoProps) {
  const arquivo = caminho ? (miniatura ? caminhoMiniatura(caminho) : caminho) : null
  const src = useUrlFoto(arquivo, bucket)
  const [falhou, setFalhou] = useState<string | null>(null)
  if (src === undefined) return <div className={`moldura moldura--carregando ${className}`} aria-busy="true" />
  if (!src || falhou === src) {
    return (
      <div className={`moldura moldura--vazia ${className}`} role="img" aria-label={`${alt} — sem foto`}>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="6" y="10" width="36" height="28" rx="2" />
          <circle cx="17" cy="20" r="4" />
          <path d="M6 33l11-9 9 7 6-5 10 8" />
        </svg>
      </div>
    )
  }
  return (
    <div className={`moldura ${className}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFalhou(src)} />
    </div>
  )
}

export function Mensagem({ tipo, children }: { tipo: 'erro' | 'ok'; children: ReactNode }) {
  if (!children) return null
  return (
    <div className={`mensagem mensagem--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

/** Executa uma consulta assíncrona e controla carregamento/erro. */
export function useConsulta<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [carregando, setCarregando] = useState(true)
  const ultima = useRef(0)

  const executar = useCallback(fn, deps)

  const recarregar = useCallback(async () => {
    const id = ++ultima.current
    setCarregando(true)
    setErro(null)
    try {
      const r = await executar()
      if (id === ultima.current) setDados(r)
    } catch (e) {
      if (id === ultima.current) setErro(e)
    } finally {
      if (id === ultima.current) setCarregando(false)
    }
  }, [executar])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, erro, carregando, recarregar, setDados }
}

/** Lança o erro do Supabase para o useConsulta capturar. */
export function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error
  return r.data as T
}

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Relíquias da Família` : 'Relíquias da Família'
  }, [titulo])
}
