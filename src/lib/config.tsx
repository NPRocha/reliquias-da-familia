import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Configuracao } from './tipos'

/** Configurações gerais (chave de vendas e textos da tela de entrada), lidas por todos. */

const PADRAO: Configuracao = {
  vendas_ativas: false,
  entrada_frase: 'Para quem cuida do que veio antes: objetos que atravessaram gerações, preservados com carinho para as que ainda virão.',
  entrada_convite: 'Cada peça tem um nome, uma origem e uma lembrança.',
  entrada_aviso: 'Acesso restrito à família e a convidados.',
  vendas_texto: 'Algumas peças do acervo estão em busca de um novo lar.',
}

interface EstadoConfig {
  config: Configuracao
  carregando: boolean
  erro: unknown
  recarregar: () => Promise<void>
}

const Ctx = createContext<EstadoConfig>({ config: PADRAO, carregando: true, erro: null, recarregar: async () => {} })

export function ProvedorConfig({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuracao>(PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<unknown>(null)

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('vendas_ativas,entrada_frase,entrada_convite,entrada_aviso,vendas_texto')
      .eq('id', 1)
      .maybeSingle()
    if (error) setErro(error)
    else {
      setErro(null)
      if (data) setConfig(data as Configuracao)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return <Ctx.Provider value={{ config, carregando, erro, recarregar }}>{children}</Ctx.Provider>
}

export const useConfig = () => useContext(Ctx)

/** Texto configurado ou o texto padrão. */
export function texto(config: Configuracao, campo: Exclude<keyof Configuracao, 'vendas_ativas'>): string {
  return config[campo]?.trim() || PADRAO[campo] || ''
}
