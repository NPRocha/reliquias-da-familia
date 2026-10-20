import { useEffect, useState, type FormEvent } from 'react'
import { Foto, Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { prepararFoto } from '../../lib/imagem'
import { BUCKET_INSTITUCIONAL, mensagemErro, supabase } from '../../lib/supabase'
import type { Institucional } from '../../lib/tipos'

export function InstitucionalAdm() {
  useTitulo('Página Sobre')
  const { dados, erro, carregando, recarregar } = useConsulta(
    async () => ok(await supabase.from('institucional').select('id,nome_responsavel,titulo,apresentacao,curriculo,foto_caminho,email,atualizado_em').eq('id', 1).maybeSingle()) as Institucional | null,
    [],
  )
  const [f, setF] = useState({ nome_responsavel: '', titulo: '', apresentacao: '', curriculo: '', email: '' })
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  useEffect(() => {
    if (!dados) return
    setF({
      nome_responsavel: dados.nome_responsavel ?? '', titulo: dados.titulo ?? '', apresentacao: dados.apresentacao ?? '',
      curriculo: dados.curriculo ?? '', email: dados.email ?? '',
    })
  }, [dados])

  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const t = (s: string) => s.trim() || null
    setSalvando(true)
    const { error } = await supabase.from('institucional').update({
      nome_responsavel: t(f.nome_responsavel), titulo: t(f.titulo), apresentacao: t(f.apresentacao),
      curriculo: t(f.curriculo), email: t(f.email),
    }).eq('id', 1)
    setSalvando(false)
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    setMsg({ tipo: 'ok', texto: 'Página Sobre atualizada.' })
    recarregar()
  }

  async function trocarFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setEnviandoFoto(true)
    setMsg(null)
    try {
      const { grande } = await prepararFoto(arquivo)
      const caminho = `responsavel-${Date.now()}.${grande.type === 'image/webp' ? 'webp' : 'jpg'}`
      const s = supabase.storage.from(BUCKET_INSTITUCIONAL)
      const up = await s.upload(caminho, grande, { contentType: grande.type, cacheControl: '31536000' })
      if (up.error) throw up.error
      const { error } = await supabase.from('institucional').update({ foto_caminho: caminho }).eq('id', 1)
      if (error) throw error
      if (dados?.foto_caminho) await s.remove([dados.foto_caminho])
      setMsg({ tipo: 'ok', texto: 'Foto atualizada.' })
      recarregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : mensagemErro(e) })
    } finally {
      setEnviandoFoto(false)
    }
  }

  if (carregando) return <p className="carregando">Carregando…</p>
  if (erro) return <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem>

  return (
    <>
      <div className="adm-topo">
        <h1>Página Sobre</h1>
        <span className="ajuda">Visível para a família e convidados enquanto as vendas estiverem desligadas.</span>
      </div>
      <form onSubmit={salvar}>
        <section className="adm-bloco" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <div>
            <Foto className="moldura-retrato" bucket={BUCKET_INSTITUCIONAL} caminho={dados?.foto_caminho} alt="Foto do responsável" />
            <label className="botao botao--claro botao--pequeno" style={{ marginTop: 10, width: '100%' }}>
              {enviandoFoto ? 'Enviando…' : 'Trocar foto'}
              <input type="file" accept="image/*" hidden disabled={enviandoFoto} onChange={(e) => trocarFoto(e.target.files?.[0])} />
            </label>
          </div>
          <div className="campos campos--2">
            <div className="campo">
              <label htmlFor="s-nome">Nome do responsável</label>
              <input id="s-nome" type="text" {...campo('nome_responsavel')} />
            </div>
            <div className="campo">
              <label htmlFor="s-titulo">Título</label>
              <input id="s-titulo" type="text" {...campo('titulo')} placeholder="Aparece no topo da página inicial" />
            </div>
            <div className="campo">
              <label htmlFor="s-email">E-mail de contato</label>
              <input id="s-email" type="email" {...campo('email')} />
            </div>
          </div>
        </section>
        <section className="adm-bloco">
          <div className="campos">
            <div className="campo">
              <label htmlFor="s-apres">Apresentação</label>
              <textarea id="s-apres" className="longo" {...campo('apresentacao')} placeholder="O primeiro parágrafo também aparece na página inicial." />
            </div>
            <div className="campo">
              <label htmlFor="s-curr">Trajetória</label>
              <textarea id="s-curr" className="longo" {...campo('curriculo')} />
            </div>
          </div>
        </section>
        {msg && <Mensagem tipo={msg.tipo}>{msg.texto}</Mensagem>}
        <div className="barra-acoes">
          <button className="botao" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </>
  )
}
