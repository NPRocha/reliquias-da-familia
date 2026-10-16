import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { limparCacheFotos, supabase } from './supabase'
import type { Perfil } from './tipos'

interface EstadoAuth {
  carregando: boolean
  sessao: Session | null
  /** Cadastro ativo do usuário logado (null se não tiver ou estiver inativo). */
  perfil: Perfil | null
  /** ADMIN ou OPERADOR. */
  equipe: boolean
  admin: boolean
  sair: () => Promise<void>
}

const Ctx = createContext<EstadoAuth>({
  carregando: true, sessao: null, perfil: null, equipe: false, admin: false, sair: async () => {},
})

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [iniciado, setIniciado] = useState(false)
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  /** id do usuário cujo perfil já foi consultado (evita "sem acesso" piscando após o login). */
  const [perfilDe, setPerfilDe] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregarPerfil(s: Session | null) {
      limparCacheFotos()
      if (!s) {
        setPerfil(null)
        setPerfilDe(null)
        return
      }
      const { data } = await supabase
        .from('perfis')
        .select('id,nome,email,whatsapp,papel,ativo')
        .eq('usuario_id', s.user.id)
        .maybeSingle()
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
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      // a renovação do token não muda o usuário: não recarrega o perfil
      if (evento === 'TOKEN_REFRESHED') return
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
  const equipe = perfil?.papel === 'ADMIN' || perfil?.papel === 'OPERADOR'
  const admin = perfil?.papel === 'ADMIN'

  return <Ctx.Provider value={{ carregando, sessao, perfil, equipe, admin, sair }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
