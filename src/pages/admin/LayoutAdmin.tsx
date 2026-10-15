import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { Link, navegar, useLocalizacao } from '../../lib/rotas'

const MENU = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/pecas', rotulo: 'Peças' },
  { href: '/admin/interesses', rotulo: 'Interesses' },
  { href: '/admin/categorias', rotulo: 'Categorias' },
  { href: '/admin/institucional', rotulo: 'Página Sobre' },
]

export function LayoutAdmin({ children }: { children: ReactNode }) {
  const { carregando, sessao, perfil, sair } = useAuth()
  const { caminho } = useLocalizacao()

  useEffect(() => {
    if (!carregando && !sessao) navegar('/admin/entrar?volta=' + encodeURIComponent(caminho), true)
  }, [carregando, sessao, caminho])

  if (carregando || !sessao) return <p className="carregando">Verificando acesso…</p>

  if (!perfil) {
    return (
      <div className="entrar">
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Sem acesso à administração</h1>
          <p>O usuário {sessao.user.email} não está cadastrado na equipe ou está inativo. Peça a um administrador para liberar o acesso.</p>
          <button className="botao botao--claro" onClick={sair}>Sair</button>
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
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} aria-current={atual(m.href)}>{m.rotulo}</Link>
        ))}
        <span className="separador" />
        <a href="/" target="_blank" rel="noopener">Ver o site</a>
        <span className="quem">{perfil.nome} · {perfil.papel === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
        <button type="button" onClick={async () => { await sair(); navegar('/admin/entrar') }}>Sair</button>
      </nav>
      <main className="adm-conteudo">{children}</main>
    </div>
  )
}
