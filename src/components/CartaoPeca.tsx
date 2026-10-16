import { Link } from '../lib/rotas'
import { formatarValor, identificacao } from '../lib/formato'
import { supabase } from '../lib/supabase'
import type { ObjetoCatalogo } from '../lib/tipos'
import { Carimbo, Etiqueta, Foto } from './comuns'

export interface FotoResumo {
  objeto_id: number
  caminho_storage: string
  principal: boolean
  ordem: number
}

export type PecaComFoto = ObjetoCatalogo & { capa: string | null }

export const COLUNAS_CATALOGO =
  'id,codigo,nome,descricao,historia,procedencia,ano_origem,material,dimensoes,categoria_id,estado_conservacao_id,situacao,valor_venda,valor_estimado,criado_em'

/** Foto de capa: a principal ou, na falta dela, a primeira. */
export function fotoCapa(fotos: { caminho_storage: string; principal: boolean; ordem: number }[]) {
  const lista = [...(fotos || [])].sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem)
  return lista[0]?.caminho_storage ?? null
}

/** Junta a foto de capa às peças do catálogo (uma consulta para todas as fotos). */
export async function comCapas(pecas: ObjetoCatalogo[]): Promise<PecaComFoto[]> {
  if (!pecas.length) return []
  const { data, error } = await supabase
    .from('imagens_objetos')
    .select('objeto_id,caminho_storage,principal,ordem')
    .in('objeto_id', pecas.map((p) => p.id))
  if (error) throw error
  const fotos = (data ?? []) as FotoResumo[]
  return pecas.map((p) => ({ ...p, capa: fotoCapa(fotos.filter((f) => f.objeto_id === p.id)) }))
}

export function CartaoPeca({ peca }: { peca: PecaComFoto }) {
  return (
    <Link href={`/peca/${peca.id}`} className="cartao">
      <Foto caminho={peca.capa} miniatura alt={peca.nome} />
      <Carimbo situacao={peca.situacao} />
      <div className="dados">
        <Etiqueta texto={identificacao(peca)} />
        <h3>{peca.nome}</h3>
        {peca.situacao === 'A_VENDA' && peca.valor_venda != null && (
          <span className="preco">{formatarValor(peca.valor_venda)}</span>
        )}
      </div>
    </Link>
  )
}
