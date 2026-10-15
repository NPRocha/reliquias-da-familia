import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Perfil } from './tipos'

interface EstadoAuth {
  carregando: boolean
  sessao: Session | null
  perfil: Perfil | null
  sair: () => Promise<void>
}

const Ctx = createContext<EstadoAuth>({ carregando: true, sessao: null, perfil: null, sair: async () => {} })

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [iniciado, setIniciado] = useState(false)
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  /** id do usuário cujo perfil já foi consultado (evita "sem acesso" piscando após o login). */
  const [perfilDe, setPerfilDe] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregarPerfil(s: Session | null) {
      if (!s) {
        setPerfil(null)
        setPerfilDe(null)
        return
      }
      const { data } = await supabase.from('perfis').select('id,nome,papel,ativo').eq('id', s.user.id).maybeSingle()
      if (!ativo) return
      setPerfil(data && data.ativo ? (data as Perfil) : null)
      setPerfilDe(s.user.id)
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setIniciado(true)
      carregarPerfil(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s)
      // fora do callback para não travar o cliente de autenticação
      setTimeout(() => carregarPerfil(s), 0)
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function sair() {
    await supabase.auth.signOut()
  }

  const carregando = !iniciado || (sessao !== null && perfilDe !== sessao.user.id)

  return <Ctx.Provider value={{ carregando, sessao, perfil, sair }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
