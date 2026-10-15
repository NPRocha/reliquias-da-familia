import { useEffect, useState } from 'react'
import { CartaoPeca, SELECT_CARTAO, type PecaComFoto } from '../components/CartaoPeca'
import { Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { navegar, useLocalizacao } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'
import type { Categoria, Situacao } from '../lib/tipos'

const FILTROS_SITUACAO: { valor: Situacao | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'A_VENDA', rotulo: 'À venda' },
  { valor: 'ACERVO', rotulo: 'Acervo da família' },
  { valor: 'VENDIDO', rotulo: 'Vendidas' },
]

export function Acervo() {
  useTitulo('Acervo')
  const { busca } = useLocalizacao()
  const situacao = (busca.get('situacao') || '') as Situacao | ''
  const categoria = busca.get('categoria') || ''
  const termo = busca.get('q') || ''
  const [texto, setTexto] = useState(termo)

  useEffect(() => setTexto(termo), [termo])

  function aplicar(mudancas: Record<string, string>) {
    const p = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries(mudancas)) v ? p.set(k, v) : p.delete(k)
    const qs = p.toString()
    navegar(`/acervo${qs ? '?' + qs : ''}`, true)
  }

  const categorias = useConsulta(async () => {
    return (ok(await supabase.from('categorias').select('id,nome,ordem').eq('ativo', true).order('ordem').order('nome')) ?? []) as Pick<
      Categoria,
      'id' | 'nome' | 'ordem'
    >[]
  }, [])

  const pecas = useConsulta(async () => {
    let q = supabase.from('objetos').select(SELECT_CARTAO).eq('publico', true)
    if (situacao === 'A_VENDA') q = q.in('situacao', ['A_VENDA', 'RESERVADO'])
    else if (situacao) q = q.eq('situacao', situacao)
    if (categoria) q = q.eq('categoria_id', Number(categoria))
    if (termo) q = q.ilike('nome', `%${termo.replace(/[%_]/g, '')}%`)
    return (ok(await q.order('criado_em', { ascending: false })) ?? []) as PecaComFoto[]
  }, [situacao, categoria, termo])

  const lista = pecas.dados ?? []

  return (
    <>
      <div className="secao-topo" style={{ marginTop: 48 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Acervo</h1>
      </div>

      <div className="filtros">
        <div className="chips" role="group" aria-label="Situação">
          {FILTROS_SITUACAO.map((f) => (
            <button key={f.valor} type="button" className="chip" aria-pressed={situacao === f.valor} onClick={() => aplicar({ situacao: f.valor })}>
              {f.rotulo}
            </button>
          ))}
        </div>
        {(categorias.dados?.length ?? 0) > 0 && (
          <select aria-label="Categoria" value={categoria} onChange={(e) => aplicar({ categoria: e.target.value })} style={{ width: 'auto' }}>
            <option value="">Todas as categorias</option>
            {categorias.dados!.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            aplicar({ q: texto.trim() })
          }}
        >
          <input type="search" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value={texto} onChange={(e) => setTexto(e.target.value)} style={{ width: 220 }} />
        </form>
        {!pecas.carregando && <span className="contagem">{lista.length === 1 ? '1 peça' : `${lista.length} peças`}</span>}
      </div>

      {pecas.erro ? (
        <Mensagem tipo="erro">{mensagemErro(pecas.erro)}</Mensagem>
      ) : pecas.carregando ? (
        <p className="carregando">Procurando…</p>
      ) : lista.length === 0 ? (
        <p className="vazio">
          Nenhuma peça encontrada com esses filtros.{' '}
          <button type="button" className="chip" onClick={() => aplicar({ situacao: '', categoria: '', q: '' })}>Limpar filtros</button>
        </p>
      ) : (
        <div className="grade">{lista.map((p) => <CartaoPeca key={p.id} peca={p} />)}</div>
      )}
    </>
  )
}
