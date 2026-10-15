import type { ReactNode } from 'react'
import { Link, useLocalizacao } from '../lib/rotas'

export function LayoutPublico({ children }: { children: ReactNode }) {
  const { caminho } = useLocalizacao()
  const atual = (p: string) => (caminho === p || caminho.startsWith(p + '/') ? 'page' : undefined)
  const ano = new Date().getFullYear()

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="cabecalho">
        <div className="miolo">
          <Link href="/" className="marca">Relíquias da Família</Link>
          <nav className="nav" aria-label="Principal">
            <Link href="/acervo" aria-current={atual('/acervo') ?? (caminho.startsWith('/peca/') ? 'page' : undefined)}>Acervo</Link>
            <Link href="/sobre" aria-current={atual('/sobre')}>Sobre</Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="miolo">{children}</main>
      <footer className="rodape">
        <div className="miolo">
          <span>© {ano} Relíquias da Família</span>
          <span>
            <Link href="/sobre">Contato</Link> · <Link href="/admin">Área da família</Link>
          </span>
        </div>
      </footer>
    </>
  )
}
