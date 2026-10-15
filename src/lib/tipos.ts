export type Situacao = 'ACERVO' | 'A_VENDA' | 'RESERVADO' | 'VENDIDO'
export type SituacaoInteresse = 'NOVO' | 'EM_CONTATO' | 'NEGOCIANDO' | 'CONCLUIDO' | 'DESCARTADO'
export type Papel = 'ADMIN' | 'OPERADOR'

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
  ordem: number
  ativo: boolean
}

export interface EstadoConservacao {
  id: number
  descricao: string
  ordem: number
}

export interface Imagem {
  id: number
  objeto_id: number
  caminho_storage: string
  legenda: string | null
  ordem: number
  principal: boolean
}

/** Colunas que o público pode ler (ver GRANT no script do banco). */
export interface ObjetoPublico {
  id: number
  codigo: string | null
  nome: string
  descricao: string | null
  historia: string | null
  procedencia: string | null
  ano_origem: string | null
  material: string | null
  dimensoes: string | null
  categoria_id: number | null
  estado_conservacao_id: number | null
  valor_venda: number | null
  situacao: Situacao
  publico: boolean
  criado_em: string
}

export interface Objeto extends ObjetoPublico {
  valor_estimado: number | null
  observacoes_internas: string | null
  criado_por: string | null
  atualizado_em: string | null
  atualizado_por: string | null
}

export interface Interesse {
  id: number
  objeto_id: number
  nome: string
  whatsapp: string
  email: string | null
  mensagem: string | null
  situacao: SituacaoInteresse
  valor_proposto: number | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
}

export interface Institucional {
  id: number
  nome_responsavel: string | null
  titulo: string | null
  apresentacao: string | null
  curriculo: string | null
  foto_caminho: string | null
  whatsapp: string | null
  email: string | null
  atualizado_em: string
}

export interface Perfil {
  id: string
  nome: string
  papel: Papel
  ativo: boolean
}
