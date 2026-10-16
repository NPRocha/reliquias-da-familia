import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { Link, navegar, useLocalizacao } from '../lib/rotas'

export function LayoutPublico({ children }: { children: ReactNode }) {
  const { caminho } = useLocalizacao()
  const { sessao, perfil, equipe, sair } = useAuth()
  const { config } = useConfig()
  const atual = (p: string) => (caminho === p || caminho.startsWith(p + '/') ? 'page' : undefined)
  const naPeca = caminho.startsWith('/peca/') ? 'page' : undefined
  const ano = new Date().getFullYear()

  async function aoSair() {
    await sair()
    navegar('/')
  }

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="cabecalho">
        <div className="miolo">
          <Link href="/" className="marca">Relíquias da Família</Link>
          <nav className="nav" aria-label="Principal">
            {config.vendas_ativas ? (
              <Link href="/acervo" aria-current={atual('/acervo') ?? naPeca}>Peças disponíveis</Link>
            ) : (
              <>
                <Link href="/acervo" aria-current={atual('/acervo') ?? naPeca}>Acervo</Link>
                <Link href="/sobre" aria-current={atual('/sobre')}>Sobre</Link>
              </>
            )}
            {equipe && <Link href="/admin">Administração</Link>}
            {sessao ? (
              <button type="button" className="nav-botao" onClick={aoSair}>Sair</button>
            ) : (
              <Link href="/">Entrar</Link>
            )}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="miolo">{children}</main>
      <footer className="rodape">
        <div className="miolo">
          <span>© {ano} Relíquias da Família</span>
          {perfil && <span>{perfil.nome}</span>}
        </div>
      </footer>
    </>
  )
}
