import { useState } from 'react'
import { fotoCapa } from '../../components/CartaoPeca'
import { Foto, Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { ROTULO_SITUACAO, formatarValor, identificacao } from '../../lib/formato'
import { Link, navegar, useLocalizacao } from '../../lib/rotas'
import { mensagemErro, supabase, urlFoto } from '../../lib/supabase'
import type { Objeto, Situacao } from '../../lib/tipos'

type Linha = Objeto & {
  categorias: { nome: string } | null
  imagens_objetos: { caminho_storage: string; principal: boolean; ordem: number }[]
}

export function Pecas() {
  useTitulo('Peças')
  const { busca } = useLocalizacao()
  const situacao = (busca.get('situacao') || '') as Situacao | ''
  const [texto, setTexto] = useState('')

  const { dados, erro, carregando } = useConsulta(async () => {
    let q = supabase.from('objetos').select('*,categorias(nome),imagens_objetos(caminho_storage,principal,ordem)')
    if (situacao) q = q.eq('situacao', situacao)
    return (ok(await q.order('criado_em', { ascending: false })) ?? []) as unknown as Linha[]
  }, [situacao])

  const t = texto.trim().toLowerCase()
  const lista = (dados ?? []).filter((p) => !t || p.nome.toLowerCase().includes(t) || (p.codigo ?? '').toLowerCase().includes(t))

  return (
    <>
      <div className="adm-topo">
        <h1>Peças</h1>
        <Link href="/admin/pecas/nova" className="botao">Cadastrar peça</Link>
      </div>
      <div className="filtros" style={{ marginBottom: 16 }}>
        <select aria-label="Situação" value={situacao} style={{ width: 'auto' }}
          onChange={(e) => navegar('/admin/pecas' + (e.target.value ? `?situacao=${e.target.value}` : ''), true)}>
          <option value="">Todas as situações</option>
          {Object.entries(ROTULO_SITUACAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <input type="search" placeholder="Buscar por nome ou código" aria-label="Buscar" value={texto} onChange={(e) => setTexto(e.target.value)} style={{ width: 260 }} />
        {dados && <span className="contagem">{lista.length} de {dados.length}</span>}
      </div>
      {erro ? <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem> : carregando ? <p className="carregando">Carregando…</p> : lista.length === 0 ? (
        <div className="vazio">
          <p>{dados?.length ? 'Nenhuma peça com esse filtro.' : 'Nenhuma peça cadastrada ainda.'}</p>
          {!dados?.length && <Link href="/admin/pecas/nova" className="botao">Cadastrar a primeira peça</Link>}
        </div>
      ) : (
        <div className="tabela-envelope">
          <table className="tabela">
            <thead>
              <tr><th className="mini"><span className="pular">Foto</span></th><th>Peça</th><th>Categoria</th><th>Situação</th><th>Valor de venda</th><th>No site</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="mini"><Foto src={urlFoto(fotoCapa(p), true)} alt="" /></td>
                  <td>
                    <Link href={`/admin/pecas/${p.id}`} className="linha-titulo">{p.nome}</Link>
                    <div style={{ color: 'var(--tinta-2)', fontSize: '0.82rem' }}>{identificacao(p)}</div>
                  </td>
                  <td>{p.categorias?.nome ?? '—'}</td>
                  <td><span className={`selo selo--${p.situacao}`}>{ROTULO_SITUACAO[p.situacao]}</span></td>
                  <td>{formatarValor(p.valor_venda) || '—'}</td>
                  <td>{p.publico ? 'Visível' : 'Oculta'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
