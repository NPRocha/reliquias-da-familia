import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { useConfig } from '../../lib/config'
import { Link, navegar, useLocalizacao } from '../../lib/rotas'

const MENU: { href: string; rotulo: string; soAdmin?: boolean }[] = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/pecas', rotulo: 'Peças' },
  { href: '/admin/interesses', rotulo: 'Interesses' },
  { href: '/admin/categorias', rotulo: 'Categorias' },
  { href: '/admin/institucional', rotulo: 'Página Sobre' },
  { href: '/admin/usuarios', rotulo: 'Usuários', soAdmin: true },
  { href: '/admin/configuracoes', rotulo: 'Configurações', soAdmin: true },
]

const ROTULO_PAPEL = { ADMIN: 'Administrador', OPERADOR: 'Operador', VISITANTE: 'Visitante' } as const

export function LayoutAdmin({ children }: { children: ReactNode }) {
  const { carregando, sessao, perfil, equipe, admin, sair } = useAuth()
  const { config } = useConfig()
  const { caminho } = useLocalizacao()

  useEffect(() => {
    if (!carregando && !sessao) navegar('/?volta=' + encodeURIComponent(caminho), true)
  }, [carregando, sessao, caminho])

  if (carregando || !sessao) return <p className="carregando">Verificando acesso…</p>

  if (!perfil || !equipe) {
    return (
      <div className="entrar">
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Sem acesso à administração</h1>
          <p>A administração é exclusiva da equipe. Peça ao administrador para liberar o acesso, se for o caso.</p>
          <Link href="/" className="botao botao--claro">Voltar ao site</Link>
        </div>
      </div>
    )
  }

  const atual = (href: string) =>
    (href === '/admin' ? caminho === '/admin' || caminho === '/admin/' : caminho.startsWith(href)) ? 'page' : undefined

  return (
    <div className="adm">
      <nav className="adm-menu" aria-label="Administração">
        <Link href="/admin" className="marca">Relíquias da Família</Link>
        {MENU.filter((m) => admin || !m.soAdmin).map((m) => (
          <Link key={m.href} href={m.href} aria-current={atual(m.href)}>{m.rotulo}</Link>
        ))}
        <span className="separador" />
        <span className={`adm-vendas${config.vendas_ativas ? ' adm-vendas--ligadas' : ''}`}>
          Vendas {config.vendas_ativas ? 'ligadas' : 'desligadas'}
        </span>
        <a href="/" target="_blank" rel="noopener">Ver o site</a>
        <span className="quem">{perfil.nome} · {ROTULO_PAPEL[perfil.papel]}</span>
        <button type="button" onClick={async () => { await sair(); navegar('/') }}>Sair</button>
      </nav>
      <main className="adm-conteudo">{children}</main>
    </div>
  )
}

/** Bloqueia páginas exclusivas do ADMIN. */
export function SoAdmin({ children }: { children: ReactNode }) {
  const { admin } = useAuth()
  if (!admin) return <p className="vazio">Esta página é exclusiva do administrador.</p>
  return <>{children}</>
}
