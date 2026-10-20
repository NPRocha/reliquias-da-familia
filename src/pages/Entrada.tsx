import { useState, type FormEvent, type ReactNode } from 'react'
import { Mensagem, useTitulo } from '../components/comuns'
import { texto, useConfig } from '../lib/config'
import { Link, navegar, useLocalizacao } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'

/** Retrato em estilo Polaroid, preso com fita, como num álbum de família. */
function Retrato() {
  return (
    <div className="polaroid-pilha">
      <span className="polaroid-fundo" aria-hidden="true" />
      <figure className="polaroid">
        <img src="/retrato.jpg" alt="Maria Anunciação Miguel entre flores" width={252} height={252} />
        <figcaption>
          <span className="polaroid-nome">Maria Anunciação Miguel</span>
          <span className="polaroid-sub">artista plástica e esteta.</span>
        </figcaption>
        <span className="fita" aria-hidden="true" />
      </figure>
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
          <h1>Relíquias <em>da Família</em></h1>
          <p className="entrada-frase">{texto(config, 'entrada_frase')}</p>
          {lateral}
        </section>
        <section className="ficha-entrada">
          <span className="fita fita--verde" aria-hidden="true" />
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
      <Link href="/acervo" className="botao botao--terracota botao--grande">
        Conhecer as peças disponíveis
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0c9a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <span className="entrada-nota">Sem necessidade de cadastro.</span>
    </div>
  )

  return (
    <MolduraEntrada lateral={vendas}>
      <div className="entrada-titulo">
        <span className="manuscrito">Bem-vindo de volta!</span>
        <h2>Veja as relíquias da família</h2>
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
