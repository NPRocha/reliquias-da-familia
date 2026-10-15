import { useState, type FormEvent } from 'react'
import { Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { mensagemErro, supabase } from '../../lib/supabase'
import type { Categoria } from '../../lib/tipos'

export function Categorias() {
  useTitulo('Categorias')
  const { dados, erro, carregando, recarregar } = useConsulta(
    async () => (ok(await supabase.from('categorias').select('*').order('ordem').order('nome')) ?? []) as Categoria[],
    [],
  )
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const ordem = (dados ?? []).reduce((m, c) => Math.max(m, c.ordem), 0) + 1
    const { error } = await supabase.from('categorias').insert({ nome: nome.trim(), ordem })
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    setNome('')
    setMsg({ tipo: 'ok', texto: 'Categoria adicionada.' })
    recarregar()
  }

  async function atualizar(c: Categoria, mudancas: Partial<Categoria>) {
    const { error } = await supabase.from('categorias').update(mudancas).eq('id', c.id)
    if (error) setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    recarregar()
  }

  async function excluir(c: Categoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"?`)) return
    const { error } = await supabase.from('categorias').delete().eq('id', c.id)
    if (error) {
      return setMsg({
        tipo: 'erro',
        texto: error.code === '23503' ? `"${c.nome}" tem peças vinculadas. Desative-a em vez de excluir.` : mensagemErro(error),
      })
    }
    recarregar()
  }

  return (
    <>
      <div className="adm-topo"><h1>Categorias</h1></div>
      <form className="adm-bloco" onSubmit={adicionar} style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <div className="campo" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="c-nome">Nova categoria</label>
          <input id="c-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Louças, Relógios, Mobiliário" maxLength={80} />
        </div>
        <button className="botao" type="submit">Adicionar</button>
      </form>
      {msg && <div style={{ marginBottom: 16 }}><Mensagem tipo={msg.tipo}>{msg.texto}</Mensagem></div>}
      {erro ? <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem> : carregando ? <p className="carregando">Carregando…</p> :
        !dados?.length ? <p className="vazio">Nenhuma categoria ainda.</p> : (
          <div className="tabela-envelope">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Ordem no site</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {dados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input type="text" aria-label="Nome" defaultValue={c.nome}
                        onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.nome && atualizar(c, { nome: e.target.value.trim() })} />
                    </td>
                    <td style={{ width: 120 }}>
                      <input type="number" aria-label="Ordem" defaultValue={c.ordem} min={0}
                        onBlur={(e) => Number(e.target.value) !== c.ordem && atualizar(c, { ordem: Number(e.target.value) || 0 })} />
                    </td>
                    <td>
                      <label className="check">
                        <input type="checkbox" checked={c.ativo} onChange={(e) => atualizar(c, { ativo: e.target.checked })} />
                        {c.ativo ? 'Ativa' : 'Inativa'}
                      </label>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => excluir(c)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
