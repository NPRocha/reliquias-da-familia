import { useState } from 'react'
import { Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { ROTULO_INTERESSE, formatarData, formatarTelefone, formatarValor, identificacao, lerValor, linkWhatsApp } from '../../lib/formato'
import { Link } from '../../lib/rotas'
import { mensagemErro, supabase } from '../../lib/supabase'
import type { Interesse, SituacaoInteresse } from '../../lib/tipos'

type Linha = Interesse & { objetos: { id: number; nome: string; codigo: string | null; situacao: string } | null }

const ABERTOS: SituacaoInteresse[] = ['NOVO', 'EM_CONTATO', 'NEGOCIANDO']

export function Interesses() {
  useTitulo('Interesses')
  const [filtro, setFiltro] = useState<'abertos' | 'todos' | SituacaoInteresse>('abertos')

  const { dados, erro, carregando, recarregar } = useConsulta(async () => {
    let q = supabase.from('interesses').select('*,objetos(id,nome,codigo,situacao)')
    if (filtro === 'abertos') q = q.in('situacao', ABERTOS)
    else if (filtro !== 'todos') q = q.eq('situacao', filtro)
    return (ok(await q.order('criado_em', { ascending: false })) ?? []) as unknown as Linha[]
  }, [filtro])

  return (
    <>
      <div className="adm-topo"><h1>Interesses</h1></div>
      <div className="filtros" style={{ marginBottom: 16 }}>
        <div className="chips" role="group" aria-label="Filtro">
          <button type="button" className="chip" aria-pressed={filtro === 'abertos'} onClick={() => setFiltro('abertos')}>Em aberto</button>
          {(Object.keys(ROTULO_INTERESSE) as SituacaoInteresse[]).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={filtro === s} onClick={() => setFiltro(s)}>{ROTULO_INTERESSE[s]}</button>
          ))}
          <button type="button" className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</button>
        </div>
      </div>
      {erro ? <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem> : carregando ? <p className="carregando">Carregando…</p> :
        !dados?.length ? <p className="vazio">Nenhum interesse nesta lista.</p> :
          dados.map((i) => <CartaoInteresse key={i.id} item={i} aoSalvar={recarregar} />)}
    </>
  )
}

function CartaoInteresse({ item, aoSalvar }: { item: Linha; aoSalvar: () => void }) {
  const [situacao, setSituacao] = useState(item.situacao)
  const [valor, setValor] = useState(item.valor_proposto == null ? '' : item.valor_proposto.toFixed(2).replace('.', ','))
  const [obs, setObs] = useState(item.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)

  const nomePeca = item.objetos ? `${item.objetos.nome} (${identificacao(item.objetos)})` : 'peça removida'
  const primeiroNome = item.nome.split(' ')[0]
  const texto = `Olá, ${primeiroNome}! Aqui é da Relíquias da Família. Recebemos seu interesse na peça "${item.objetos?.nome ?? ''}".`

  async function salvar() {
    const v = lerValor(valor)
    if (valor.trim() && v == null) return setMsg({ tipo: 'erro', texto: 'Valor inválido.' })
    setSalvando(true)
    const { error } = await supabase.from('interesses').update({ situacao, valor_proposto: v, observacoes: obs.trim() || null }).eq('id', item.id)
    setSalvando(false)
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    setMsg({ tipo: 'ok', texto: 'Salvo.' })
    aoSalvar()
  }

  return (
    <article className="cartao-interesse">
      <div className="topo">
        <strong>{item.nome}</strong>
        <span className={`selo selo--${item.situacao}`}>{ROTULO_INTERESSE[item.situacao]}</span>
        <span className="meta">{formatarData(item.criado_em)}</span>
      </div>
      <div className="meta">
        Peça: {item.objetos ? <Link href={`/admin/pecas/${item.objetos.id}`}>{nomePeca}</Link> : nomePeca}
        {' · '}WhatsApp {formatarTelefone(item.whatsapp)}
        {item.email && <> · <a href={`mailto:${item.email}`}>{item.email}</a></>}
        {item.valor_proposto != null && <> · Proposta {formatarValor(item.valor_proposto)}</>}
      </div>
      {item.mensagem && <blockquote>{item.mensagem}</blockquote>}
      <div className="edicao">
        <div className="campo">
          <label htmlFor={`s-${item.id}`}>Situação</label>
          <select id={`s-${item.id}`} value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoInteresse)}>
            {(Object.keys(ROTULO_INTERESSE) as SituacaoInteresse[]).map((s) => <option key={s} value={s}>{ROTULO_INTERESSE[s]}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`v-${item.id}`}>Valor proposto (R$)</label>
          <input id={`v-${item.id}`} type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor={`o-${item.id}`}>Anotações</label>
          <input id={`o-${item.id}`} type="text" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="botao botao--claro" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <a className="botao botao--whats" href={linkWhatsApp(item.whatsapp, texto)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
      {msg && <Mensagem tipo={msg.tipo}>{msg.texto}</Mensagem>}
    </article>
  )
}
