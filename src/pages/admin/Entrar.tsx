import { useEffect, useState, type FormEvent } from 'react'
import { Mensagem, useTitulo } from '../../components/comuns'
import { useAuth } from '../../lib/auth'
import { Link, navegar, useLocalizacao } from '../../lib/rotas'
import { mensagemErro, supabase } from '../../lib/supabase'

export function Entrar() {
  useTitulo('Entrar')
  const { sessao, carregando } = useAuth()
  const { busca } = useLocalizacao()
  const volta = busca.get('volta')?.startsWith('/admin') ? busca.get('volta')! : '/admin'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!carregando && sessao) navegar(volta, true)
  }, [carregando, sessao, volta])

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) setErro(mensagemErro(error))
  }

  return (
    <div className="entrar">
      <form onSubmit={entrar}>
        <h1>Área da família</h1>
        <div className="campo">
          <label htmlFor="e-email">E-mail</label>
          <input id="e-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="e-senha">Senha</label>
          <input id="e-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        <Mensagem tipo="erro">{erro}</Mensagem>
        <button className="botao" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <Link href="/" style={{ fontSize: '0.9rem' }}>Voltar ao site</Link>
      </form>
    </div>
  )
}
