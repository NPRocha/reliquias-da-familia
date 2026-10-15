import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import { LayoutPublico } from './components/LayoutPublico'
import { ProvedorAuth } from './lib/auth'
import { casar, Link, useLocalizacao } from './lib/rotas'
import { configurado } from './lib/supabase'
import { Acervo } from './pages/Acervo'
import { Inicio } from './pages/Inicio'
import { Peca } from './pages/Peca'
import { Sobre } from './pages/Sobre'
import { Categorias } from './pages/admin/Categorias'
import { Entrar } from './pages/admin/Entrar'
import { InstitucionalAdm } from './pages/admin/InstitucionalAdm'
import { Interesses } from './pages/admin/Interesses'
import { LayoutAdmin } from './pages/admin/LayoutAdmin'
import { Painel } from './pages/admin/Painel'
import { PecaEditar } from './pages/admin/PecaEditar'
import { Pecas } from './pages/admin/Pecas'

type Rota = [padrao: string, render: (p: Record<string, string>) => ReactNode]

const PUBLICAS: Rota[] = [
  ['/', () => <Inicio />],
  ['/acervo', () => <Acervo />],
  ['/peca/:id', (p) => <Peca key={p.id} id={p.id} />],
  ['/sobre', () => <Sobre />],
]

const ADMIN: Rota[] = [
  ['/admin', () => <Painel />],
  ['/admin/pecas', () => <Pecas />],
  ['/admin/pecas/:id', (p) => <PecaEditar key={p.id} id={p.id} />],
  ['/admin/interesses', () => <Interesses />],
  ['/admin/categorias', () => <Categorias />],
  ['/admin/institucional', () => <InstitucionalAdm />],
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
      <p>O endereço pode ter mudado ou a peça foi retirada do site.</p>
      <Link href="/acervo" className="botao">Ir para o acervo</Link>
    </div>
  )
}

function App() {
  const { caminho } = useLocalizacao()

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

  if (caminho === '/admin/entrar') return <Entrar />
  if (caminho === '/admin' || caminho.startsWith('/admin/')) {
    return <LayoutAdmin>{resolver(ADMIN, caminho) ?? <NaoEncontrada />}</LayoutAdmin>
  }
  return <LayoutPublico>{resolver(PUBLICAS, caminho) ?? <NaoEncontrada />}</LayoutPublico>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvedorAuth>
      <App />
    </ProvedorAuth>
  </StrictMode>,
)
