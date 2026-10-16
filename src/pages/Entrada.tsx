import { useState, type FormEvent, type ReactNode } from 'react'
import { Mensagem, useTitulo } from '../components/comuns'
import { texto, useConfig } from '../lib/config'
import { Link, navegar, useLocalizacao } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'

/** Retrato em moldura oval (desenho em traço da matriarca da família). */
function Retrato() {
  return (
    <div className="retrato">
      <div className="retrato-foto">
        <img src="/retrato.png" alt="Retrato em traço da matriarca da família" width={360} height={460} />
      </div>
      <svg viewBox="0 0 168 212" fill="none" aria-hidden="true">
        <ellipse cx="84" cy="106" rx="80" ry="102" stroke="var(--latao)" strokeWidth="2" />
        <ellipse cx="84" cy="106" rx="72" ry="94" stroke="var(--latao)" strokeWidth="1" />
        <ellipse cx="84" cy="106" rx="64" ry="86" stroke="var(--linha)" strokeWidth="1" />
        <path d="M84 4 l5 7 -5 6 -5 -6z M84 208 l5 -7 -5 -6 -5 6z" fill="var(--latao)" />
      </svg>
    </div>
  )
}

/** Estrutura comum da tela de entrada e do primeiro acesso. */
export function MolduraEntrada({ lateral, children }: { lateral?: ReactNode; children: ReactNode }) {
  const { config } = useConfig()
  return (
    <div className="entrada">
      <div className="entrada-miolo">
        <section className="entrada-apresentacao">
          <Retrato />
          <p className="entrada-sobretitulo">Acervo de família</p>
          <h1>Relíquias da Família</h1>
          <p className="entrada-frase">{texto(config, 'entrada_frase')}</p>
          <span className="entrada-fio" aria-hidden="true" />
          {lateral}
        </section>
        <section className="ficha-entrada">
          <span className="cantoneira cantoneira--1" aria-hidden="true" />
          <span className="cantoneira cantoneira--2" aria-hidden="true" />
          <span className="cantoneira cantoneira--3" aria-hidden="true" />
          <span className="cantoneira cantoneira--4" aria-hidden="true" />
          {children}
        </section>
      </div>
    </div>
  )
}

export function Entrada() {
  useTitulo('')
  const { config } = useConfig()
  const { busca } = useLocalizacao()
  const volta = busca.get('volta')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    setEnviando(false)
    if (error) return setErro(mensagemErro(error))
    navegar(volta && volta.startsWith('/') && !volta.startsWith('//') ? volta : '/', true)
  }

  const vendas = config.vendas_ativas && (
    <div className="entrada-vendas">
      <p>{texto(config, 'vendas_texto')}</p>
      <Link href="/acervo" className="botao botao--escuro botao--grande">
        Conhecer as peças disponíveis
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--latao)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <span className="entrada-nota">Sem necessidade de cadastro.</span>
    </div>
  )

  return (
    <MolduraEntrada lateral={vendas}>
      <div className="entrada-titulo">
        <h2>Bem-vindo</h2>
        <p>{texto(config, 'entrada_convite')}</p>
      </div>
      <form onSubmit={entrar} className="campos">
        <div className="campo">
          <label htmlFor="e-email">E-mail</label>
          <input id="e-email" type="email" autoComplete="username" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="e-senha">Senha</label>
          <input id="e-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        <Mensagem tipo="erro">{erro}</Mensagem>
        <button className="botao botao--grande" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <div className="entrada-links">
          <Link href="/primeiro-acesso">Primeiro acesso</Link>
          <span aria-hidden="true">·</span>
          <Link href="/primeiro-acesso?esqueci=1">Esqueci minha senha</Link>
        </div>
      </form>
      <hr />
      <p className="entrada-aviso">{texto(config, 'entrada_aviso')}</p>
    </MolduraEntrada>
  )
}
