import { useEffect, useState } from 'react'
import { CartaoPeca, COLUNAS_CATALOGO, comCapas } from '../components/CartaoPeca'
import { Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { texto as textoConfig, useConfig } from '../lib/config'
import { navegar, useLocalizacao } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'
import type { Categoria, ObjetoCatalogo } from '../lib/tipos'

/**
 * Lista de peças. Vendas desligadas: o acervo da família (só com login).
 * Vendas ligadas: só as peças à venda, para o público e os visitantes.
 */
export function Acervo() {
  const { config } = useConfig()
  const vendas = config.vendas_ativas
  useTitulo(vendas ? 'Peças disponíveis' : 'Acervo')
  const { busca } = useLocalizacao()
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
    let q = supabase.from('catalogo').select(COLUNAS_CATALOGO)
    if (categoria) q = q.eq('categoria_id', Number(categoria))
    if (termo) q = q.ilike('nome', `%${termo.replace(/[%_]/g, '')}%`)
    return comCapas((ok(await q.order('criado_em', { ascending: false })) ?? []) as ObjetoCatalogo[])
  }, [categoria, termo, vendas])

  const lista = pecas.dados ?? []

  return (
    <>
      <div className="secao-topo" style={{ marginTop: 48, marginBottom: vendas ? 8 : 24 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>{vendas ? 'Peças disponíveis' : 'Acervo'}</h1>
      </div>
      {vendas && <p className="introducao">{textoConfig(config, 'vendas_texto')}</p>}

      <div className="filtros">
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
          {categoria || termo ? 'Nenhuma peça encontrada com esses filtros. ' : vendas ? 'No momento não há peças disponíveis.' : 'As primeiras peças estão sendo catalogadas.'}
          {(categoria || termo) && (
            <button type="button" className="chip" onClick={() => aplicar({ categoria: '', q: '' })}>Limpar filtros</button>
          )}
        </p>
      ) : (
        <div className="grade">{lista.map((p) => <CartaoPeca key={p.id} peca={p} />)}</div>
      )}
    </>
  )
}
