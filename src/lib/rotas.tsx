import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/** Roteador mínimo baseado no History API (sem dependências). */

const EVENTO = 'rdf:navegar'

export function navegar(para: string, substituir = false) {
  if (substituir) history.replaceState(null, '', para)
  else history.pushState(null, '', para)
  window.dispatchEvent(new Event(EVENTO))
  window.scrollTo(0, 0)
}

export function useLocalizacao() {
  const ler = () => ({ caminho: location.pathname, busca: new URLSearchParams(location.search) })
  const [loc, setLoc] = useState(ler)
  useEffect(() => {
    const atualizar = () => setLoc(ler())
    window.addEventListener('popstate', atualizar)
    window.addEventListener(EVENTO, atualizar)
    return () => {
      window.removeEventListener('popstate', atualizar)
      window.removeEventListener(EVENTO, atualizar)
    }
  }, [])
  return loc
}

/** Compara "/peca/:id" com "/peca/12" e devolve { id: "12" } ou null. */
export function casar(padrao: string, caminho: string): Record<string, string> | null {
  const a = padrao.split('/').filter(Boolean)
  const b = caminho.replace(/\/+$/, '').split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export function Link({ href, onClick, ...resto }: LinkProps) {
  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (resto.target === '_blank' || /^https?:/.test(href)) return
    e.preventDefault()
    navegar(href)
  }
  return <a href={href} onClick={aoClicar} {...resto} />
}
