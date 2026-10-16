import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import { LayoutPublico } from './components/LayoutPublico'
import { ProvedorAuth, useAuth } from './lib/auth'
import { ProvedorConfig, useConfig } from './lib/config'
import { casar, Link, navegar, useLocalizacao } from './lib/rotas'
import { configurado } from './lib/supabase'
import { Acervo } from './pages/Acervo'
import { Entrada } from './pages/Entrada'
import { Inicio } from './pages/Inicio'
import { Peca } from './pages/Peca'
import { PrimeiroAcesso } from './pages/PrimeiroAcesso'
import { Sobre } from './pages/Sobre'
import { Categorias } from './pages/admin/Categorias'
import { Configuracoes } from './pages/admin/Configuracoes'
import { InstitucionalAdm } from './pages/admin/InstitucionalAdm'
import { Interesses } from './pages/admin/Interesses'
import { LayoutAdmin } from './pages/admin/LayoutAdmin'
import { Painel } from './pages/admin/Painel'
import { PecaEditar } from './pages/admin/PecaEditar'
import { Pecas } from './pages/admin/Pecas'
import { Usuarios } from './pages/admin/Usuarios'

type Rota = [padrao: string, render: (p: Record<string, string>) => ReactNode]

/** Vendas desligadas: só família/convidados com login. */
const ACERVO: Rota[] = [
  ['/', () => <Inicio />],
  ['/acervo', () => <Acervo />],
  ['/peca/:id', (p) => <Peca key={p.id} id={p.id} />],
  ['/sobre', () => <Sobre />],
]

/** Vendas ligadas: público e visitantes veem as peças à venda. */
const VENDAS: Rota[] = [
  ['/', () => <Acervo />],
  ['/acervo', () => <Acervo />],
  ['/peca/:id', (p) => <Peca key={p.id} id={p.id} />],
]

const ADMIN: Rota[] = [
  ['/admin', () => <Painel />],
  ['/admin/pecas', () => <Pecas />],
  ['/admin/pecas/:id', (p) => <PecaEditar key={p.id} id={p.id} />],
  ['/admin/interesses', () => <Interesses />],
  ['/admin/categorias', () => <Categorias />],
  ['/admin/institucional', () => <InstitucionalAdm />],
  ['/admin/usuarios', () => <Usuarios />],
  ['/admin/configuracoes', () => <Configuracoes />],
]

function resolver(rotas: Rota[], caminho: string): ReactNode | null {
  for (const [padrao, render] of rotas) {
    const p = casar(padrao, caminho)
    if (p) return render(p)
  }
  return null
}

function NaoEncontrada() {
  return (
    <div className="vazio">
      <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>Página não encontrada</h1>
      <p>O endereço pode ter mudado ou a peça não está disponível.</p>
      <Link href="/" className="botao">Ir para o início</Link>
    </div>
  )
}

/** Leva à tela de entrada, guardando a página pedida. */
function IrParaEntrada({ caminho }: { caminho: string }) {
  useEffect(() => {
    navegar('/?volta=' + encodeURIComponent(caminho + location.search), true)
  }, [caminho])
  return <p className="carregando">Abrindo…</p>
}

function SemAcesso() {
  const { sessao, sair } = useAuth()
  return (
    <div className="entrar">
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Acesso não liberado</h1>
        <p>O usuário {sessao?.user.email} não está cadastrado ou está inativo. Fale com o administrador.</p>
        <button className="botao botao--claro" onClick={async () => { await sair(); navegar('/') }}>Sair</button>
      </div>
    </div>
  )
}

function App() {
  const { caminho } = useLocalizacao()
  const { carregando: carregandoAuth, sessao, perfil } = useAuth()
  const { config, carregando: carregandoConfig } = useConfig()

  if (!configurado) {
    return (
      <div className="entrar">
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Configuração pendente</h1>
          <p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (arquivo .env.local ou variáveis do Cloudflare Pages).</p>
        </div>
      </div>
    )
  }

  if (carregandoAuth || carregandoConfig) return <p className="carregando">Abrindo…</p>

  if (caminho === '/primeiro-acesso') return <PrimeiroAcesso />
  if (caminho === '/admin/entrar') return <IrParaEntrada caminho="/admin" />

  if (caminho === '/admin' || caminho.startsWith('/admin/')) {
    return <LayoutAdmin>{resolver(ADMIN, caminho) ?? <NaoEncontrada />}</LayoutAdmin>
  }

  // Sem login: tela de entrada (com vendas ligadas, o público também navega pelas peças).
  if (!sessao) {
    if (caminho === '/' || caminho === '') return <Entrada />
    if (config.vendas_ativas && caminho !== '/sobre') {
      return <LayoutPublico>{resolver(VENDAS, caminho) ?? <NaoEncontrada />}</LayoutPublico>
    }
    return <IrParaEntrada caminho={caminho} />
  }

  if (!perfil) return <SemAcesso />

  const rotas = config.vendas_ativas ? VENDAS : ACERVO
  return <LayoutPublico>{resolver(rotas, caminho) ?? <NaoEncontrada />}</LayoutPublico>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvedorConfig>
      <ProvedorAuth>
        <App />
      </ProvedorAuth>
    </ProvedorConfig>
  </StrictMode>,
)
