import { useState, type FormEvent } from 'react'
import { Mensagem, useTitulo } from '../components/comuns'
import { soDigitos } from '../lib/formato'
import { Link, navegar, useLocalizacao } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'
import { MolduraEntrada } from './Entrada'

/** Criação da senha com o código de 6 dígitos enviado pelo administrador (primeiro acesso ou nova senha). */
export function PrimeiroAcesso() {
  useTitulo('Primeiro acesso')
  const { busca } = useLocalizacao()
  const esqueci = Boolean(busca.get('esqueci'))
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const cod = soDigitos(codigo)
    if (cod.length !== 6) return setErro('O código tem 6 dígitos.')
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== confirmacao) return setErro('A confirmação não confere com a senha.')
    setEnviando(true)
    const emailLimpo = email.trim().toLowerCase()
    const { data, error } = await supabase.rpc('fn_primeiro_acesso', { p_email: emailLimpo, p_codigo: cod, p_senha: senha })
    if (error || data !== 'OK') {
      setEnviando(false)
      return setErro(error ? mensagemErro(error) : String(data))
    }
    const login = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha })
    setEnviando(false)
    if (login.error) return setErro(mensagemErro(login.error))
    navegar('/', true)
  }

  return (
    <MolduraEntrada>
      <div className="entrada-titulo">
        <h2>{esqueci ? 'Nova senha' : 'Primeiro acesso'}</h2>
        <p>
          {esqueci
            ? 'Peça um novo código de acesso ao administrador. Com ele, crie aqui uma nova senha.'
            : 'Use o código de 6 dígitos que o administrador enviou para criar a sua senha.'}
        </p>
      </div>
      <form onSubmit={enviar} className="campos" noValidate>
        <div className="campo">
          <label htmlFor="p-email">E-mail cadastrado</label>
          <input id="p-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="p-codigo">Código de acesso</label>
          <input id="p-codigo" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
          <span className="ajuda">Vale por 48 horas. Após 5 tentativas erradas, é preciso pedir outro.</span>
        </div>
        <div className="campo">
          <label htmlFor="p-senha">Nova senha</label>
          <input id="p-senha" type="password" autoComplete="new-password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <span className="ajuda">Pelo menos 8 caracteres.</span>
        </div>
        <div className="campo">
          <label htmlFor="p-conf">Confirme a senha</label>
          <input id="p-conf" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
        </div>
        <Mensagem tipo="erro">{erro}</Mensagem>
        <button className="botao botao--grande" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Criar senha e entrar'}</button>
        <div className="entrada-links">
          <Link href="/">Voltar à entrada</Link>
        </div>
      </form>
    </MolduraEntrada>
  )
}
