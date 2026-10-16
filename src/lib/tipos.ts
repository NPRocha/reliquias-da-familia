export type Situacao = 'ACERVO' | 'A_VENDA' | 'RESERVADO' | 'VENDIDO'
export type SituacaoInteresse = 'NOVO' | 'EM_CONTATO' | 'NEGOCIANDO' | 'CONCLUIDO' | 'DESCARTADO'
export type Papel = 'ADMIN' | 'OPERADOR' | 'VISITANTE'

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

/** Colunas da visão "catalogo" (o que o site pode ler; ver 003 no banco). */
export interface ObjetoCatalogo {
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
  /** Com vendas desligadas, sempre ACERVO. */
  situacao: Situacao
  /** Só com vendas ligadas e peça à venda. */
  valor_venda: number | null
  /** Só para família/convidados com vendas desligadas. */
  valor_estimado: number | null
  criado_em: string
}

/** Tabela completa (só a equipe lê). */
export interface Objeto {
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
  valor_estimado: number | null
  observacoes_internas: string | null
  criado_por: string | null
  atualizado_em: string | null
  atualizado_por: string | null
  reservado_para: number | null
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
  email: string | null
  atualizado_em: string
}

export interface Perfil {
  id: string
  nome: string
  email: string
  whatsapp: string | null
  papel: Papel
  ativo: boolean
}

/** Cadastro completo, para a tela de usuários (ADMIN). */
export interface Usuario extends Perfil {
  usuario_id: string | null
  codigo_expira: string | null
  criado_em: string
}

export const COLUNAS_USUARIO = 'id,nome,email,whatsapp,papel,ativo,usuario_id,codigo_expira,criado_em'

export interface Configuracao {
  vendas_ativas: boolean
  entrada_frase: string | null
  entrada_convite: string | null
  entrada_aviso: string | null
  vendas_texto: string | null
}
