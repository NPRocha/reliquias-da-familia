import { useState, type FormEvent } from 'react'
import { Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { useAuth } from '../../lib/auth'
import { formatarData, formatarTelefone, linkWhatsApp, soDigitos } from '../../lib/formato'
import { mensagemErro, supabase } from '../../lib/supabase'
import { COLUNAS_USUARIO, type Papel, type Usuario } from '../../lib/tipos'
import { SoAdmin } from './LayoutAdmin'

const PAPEIS: { valor: Papel; rotulo: string; ajuda: string }[] = [
  { valor: 'VISITANTE', rotulo: 'Visitante', ajuda: 'Família e convidados: veem o acervo no site.' },
  { valor: 'OPERADOR', rotulo: 'Operador', ajuda: 'Cadastra peças e fotos e atende interesses.' },
  { valor: 'ADMIN', rotulo: 'Administrador', ajuda: 'Tudo, inclusive usuários e a chave de vendas.' },
]

/** Normaliza o WhatsApp para só dígitos com DDD (sem o 55). */
function lerWhatsApp(s: string): string | null | false {
  let d = soDigitos(s)
  if (!d) return null
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  return d.length === 10 || d.length === 11 ? d : false
}

interface CodigoGerado {
  nome: string
  email: string
  whatsapp: string | null
  codigo: string
}

function mensagemConvite(c: CodigoGerado) {
  return (
    `Olá, ${c.nome.split(' ')[0]}! Seu acesso ao Relíquias da Família está liberado.\n` +
    `1. Acesse ${location.origin}/primeiro-acesso\n` +
    `2. Informe o e-mail ${c.email} e o código ${c.codigo}\n` +
    `3. Crie a sua senha.\n` +
    `O código vale por 48 horas.`
  )
}

export function Usuarios() {
  return (
    <SoAdmin>
      <ListaUsuarios />
    </SoAdmin>
  )
}

function ListaUsuarios() {
  useTitulo('Usuários')
  const { perfil } = useAuth()
  const { dados, erro, carregando, recarregar } = useConsulta(
    async () => (ok(await supabase.from('perfis').select(COLUNAS_USUARIO).order('nome')) ?? []) as Usuario[],
    [],
  )
  const [novo, setNovo] = useState({ nome: '', email: '', whatsapp: '', papel: 'VISITANTE' as Papel })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [gerado, setGerado] = useState<CodigoGerado | null>(null)

  async function gerarCodigo(u: { id: string; nome: string; email: string; whatsapp: string | null }) {
    const { data, error } = await supabase.rpc('fn_gerar_codigo', { p_perfil: u.id })
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    setGerado({ nome: u.nome, email: u.email, whatsapp: u.whatsapp, codigo: String(data) })
    setMsg(null)
    recarregar()
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setGerado(null)
    const whats = lerWhatsApp(novo.whatsapp)
    if (novo.nome.trim().length < 2) return setMsg({ tipo: 'erro', texto: 'Informe o nome.' })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(novo.email.trim())) return setMsg({ tipo: 'erro', texto: 'Informe um e-mail válido.' })
    if (whats === false) return setMsg({ tipo: 'erro', texto: 'WhatsApp inválido. Use DDD + número, ex.: (85) 99999-0000.' })
    setSalvando(true)
    const dadosNovo = { nome: novo.nome.trim(), email: novo.email.trim().toLowerCase(), whatsapp: whats, papel: novo.papel }
    const { data, error } = await supabase.from('perfis').insert(dadosNovo).select('id').single()
    setSalvando(false)
    if (error) {
      return setMsg({ tipo: 'erro', texto: error.code === '23505' ? 'Já existe um usuário com esse e-mail.' : mensagemErro(error) })
    }
    setNovo({ nome: '', email: '', whatsapp: '', papel: 'VISITANTE' })
    await gerarCodigo({ id: data.id as string, nome: dadosNovo.nome, email: dadosNovo.email, whatsapp: dadosNovo.whatsapp })
  }

  async function atualizar(u: Usuario, mudancas: Partial<Usuario>) {
    setMsg(null)
    const { error } = await supabase.from('perfis').update(mudancas).eq('id', u.id)
    if (error) setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    recarregar()
  }

  function salvarWhatsApp(u: Usuario, valor: string) {
    const w = lerWhatsApp(valor)
    if (w === false) return setMsg({ tipo: 'erro', texto: `WhatsApp inválido para ${u.nome}.` })
    if (w !== u.whatsapp) atualizar(u, { whatsapp: w })
  }

  function situacao(u: Usuario) {
    if (!u.ativo) return { classe: 'DESCARTADO', texto: 'Inativo' }
    if (u.usuario_id) return { classe: 'A_VENDA', texto: 'Com acesso' }
    if (u.codigo_expira && new Date(u.codigo_expira) > new Date()) return { classe: 'EM_CONTATO', texto: 'Aguardando primeiro acesso' }
    return { classe: 'EM_CONTATO', texto: 'Sem código válido' }
  }

  return (
    <>
      <div className="adm-topo"><h1>Usuários</h1></div>

      <form className="adm-bloco" onSubmit={cadastrar}>
        <h2>Cadastrar usuário</h2>
        <div className="campos campos--2">
          <div className="campo">
            <label htmlFor="u-nome">Nome</label>
            <input id="u-nome" type="text" value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} maxLength={120} required />
          </div>
          <div className="campo">
            <label htmlFor="u-email">E-mail (usado para entrar)</label>
            <input id="u-email" type="email" value={novo.email} onChange={(e) => setNovo((n) => ({ ...n, email: e.target.value }))} required />
          </div>
          <div className="campo">
            <label htmlFor="u-whats">WhatsApp</label>
            <input id="u-whats" type="tel" placeholder="(85) 99999-0000" value={novo.whatsapp} onChange={(e) => setNovo((n) => ({ ...n, whatsapp: e.target.value }))} />
            <span className="ajuda">Para enviar o código e preencher o “Tenho interesse”.</span>
          </div>
          <div className="campo">
            <label htmlFor="u-papel">Tipo de acesso</label>
            <select id="u-papel" value={novo.papel} onChange={(e) => setNovo((n) => ({ ...n, papel: e.target.value as Papel }))}>
              {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
            </select>
            <span className="ajuda">{PAPEIS.find((p) => p.valor === novo.papel)?.ajuda}</span>
          </div>
        </div>
        <div className="barra-acoes">
          <button className="botao" type="submit" disabled={salvando}>{salvando ? 'Cadastrando…' : 'Cadastrar e gerar código'}</button>
        </div>
      </form>

      {gerado && <CodigoAcesso gerado={gerado} aoFechar={() => setGerado(null)} />}
      {msg && <div style={{ marginBottom: 16 }}><Mensagem tipo={msg.tipo}>{msg.texto}</Mensagem></div>}

      {erro ? <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem> : carregando ? <p className="carregando">Carregando…</p> : (
        <div className="tabela-envelope">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Tipo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {(dados ?? []).map((u) => {
                const s = situacao(u)
                const euMesmo = u.id === perfil?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <input type="text" aria-label="Nome" defaultValue={u.nome}
                        onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== u.nome && atualizar(u, { nome: e.target.value.trim() })} />
                    </td>
                    <td>
                      {u.usuario_id ? (
                        <span title="O e-mail não muda depois do primeiro acesso">{u.email}</span>
                      ) : (
                        <input type="email" aria-label="E-mail" defaultValue={u.email}
                          onBlur={(e) => {
                            const v = e.target.value.trim().toLowerCase()
                            if (v && v !== u.email) atualizar(u, { email: v })
                          }} />
                      )}
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <input type="tel" aria-label="WhatsApp" defaultValue={formatarTelefone(u.whatsapp)} onBlur={(e) => salvarWhatsApp(u, e.target.value)} />
                    </td>
                    <td>
                      <select aria-label="Tipo de acesso" value={u.papel} disabled={euMesmo} onChange={(e) => atualizar(u, { papel: e.target.value as Papel })}>
                        {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`selo selo--${s.classe}`}>{s.texto}</span>
                      {!u.usuario_id && u.codigo_expira && u.ativo && (
                        <div className="ajuda" style={{ marginTop: 4 }}>Código até {formatarData(u.codigo_expira)}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {u.ativo && (
                        <button type="button" className="botao botao--claro botao--pequeno" onClick={() => gerarCodigo(u)}>
                          {u.usuario_id ? 'Código para nova senha' : 'Novo código'}
                        </button>
                      )}{' '}
                      {!euMesmo && (
                        <button type="button" className={`botao botao--pequeno ${u.ativo ? 'botao--perigo' : 'botao--claro'}`}
                          onClick={() => (!u.ativo || confirm(`Bloquear o acesso de ${u.nome}?`)) && atualizar(u, { ativo: !u.ativo })}>
                          {u.ativo ? 'Bloquear' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function CodigoAcesso({ gerado, aoFechar }: { gerado: CodigoGerado; aoFechar: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const texto = mensagemConvite(gerado)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <section className="adm-bloco codigo-acesso" role="status">
      <h2>Código de acesso de {gerado.nome}</h2>
      <p className="codigo">{gerado.codigo}</p>
      <p className="ajuda" style={{ marginTop: 0 }}>
        Válido por 48 horas. Ele só aparece agora: envie à pessoa. Se perder, gere outro.
      </p>
      <pre className="convite">{texto}</pre>
      <div className="barra-acoes">
        {gerado.whatsapp && (
          <a className="botao botao--whats" href={linkWhatsApp(gerado.whatsapp, texto)} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
        )}
        <button type="button" className="botao botao--claro" onClick={copiar}>{copiado ? 'Mensagem copiada' : 'Copiar mensagem'}</button>
        <button type="button" className="botao botao--claro direita" onClick={aoFechar}>Fechar</button>
      </div>
    </section>
  )
}
