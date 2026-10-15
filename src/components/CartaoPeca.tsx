import { Link } from '../lib/rotas'
import { formatarValor, identificacao } from '../lib/formato'
import { urlFoto } from '../lib/supabase'
import type { ObjetoPublico } from '../lib/tipos'
import { Carimbo, Etiqueta, Foto } from './comuns'

export type PecaComFoto = ObjetoPublico & {
  imagens_objetos: { caminho_storage: string; principal: boolean; ordem: number }[]
}

/** Colunas públicas + fotos, para listagens. */
export const SELECT_CARTAO =
  'id,codigo,nome,descricao,historia,procedencia,ano_origem,material,dimensoes,categoria_id,estado_conservacao_id,valor_venda,situacao,publico,criado_em,imagens_objetos(caminho_storage,principal,ordem)'

export function fotoCapa(p: { imagens_objetos: { caminho_storage: string; principal: boolean; ordem: number }[] }) {
  const lista = [...(p.imagens_objetos || [])].sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem)
  return lista[0]?.caminho_storage ?? null
}

export function CartaoPeca({ peca }: { peca: PecaComFoto }) {
  return (
    <Link href={`/peca/${peca.id}`} className="cartao">
      <Foto src={urlFoto(fotoCapa(peca), true)} alt={peca.nome} />
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
