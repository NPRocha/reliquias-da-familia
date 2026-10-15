import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Foto, Mensagem, ok, useConsulta, useTitulo } from '../../components/comuns'
import { useAuth } from '../../lib/auth'
import { ROTULO_SITUACAO, identificacao, lerValor } from '../../lib/formato'
import { prepararFoto } from '../../lib/imagem'
import { Link, navegar, useLocalizacao } from '../../lib/rotas'
import { BUCKET_OBJETOS, caminhoMiniatura, mensagemErro, supabase, urlFoto } from '../../lib/supabase'
import type { Categoria, EstadoConservacao, Imagem, Objeto, Situacao } from '../../lib/tipos'

interface Form {
  codigo: string
  nome: string
  descricao: string
  historia: string
  procedencia: string
  ano_origem: string
  material: string
  dimensoes: string
  categoria_id: string
  estado_conservacao_id: string
  valor_estimado: string
  valor_venda: string
  situacao: Situacao
  publico: boolean
  observacoes_internas: string
}

const VAZIO: Form = {
  codigo: '', nome: '', descricao: '', historia: '', procedencia: '', ano_origem: '', material: '', dimensoes: '',
  categoria_id: '', estado_conservacao_id: '', valor_estimado: '', valor_venda: '', situacao: 'ACERVO', publico: true,
  observacoes_internas: '',
}

const valorParaTexto = (v: number | null) => (v == null ? '' : v.toFixed(2).replace('.', ','))

export function PecaEditar({ id }: { id: string }) {
  const nova = id === 'nova'
  const objetoId = nova ? null : Number(id)
  const { sessao } = useAuth()
  const { busca } = useLocalizacao()
  const [form, setForm] = useState<Form>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const recemCriada = Boolean(busca.get('criada'))
  useTitulo(nova ? 'Nova peça' : form.nome || 'Peça')

  const apoio = useConsulta(async () => {
    const [cats, ests] = await Promise.all([
      supabase.from('categorias').select('*').order('ordem').order('nome'),
      supabase.from('estados_conservacao').select('*').order('ordem'),
    ])
    return { categorias: (ok(cats) ?? []) as Categoria[], estados: (ok(ests) ?? []) as EstadoConservacao[] }
  }, [])

  const objeto = useConsulta(async () => {
    if (objetoId == null) return null
    return ok(await supabase.from('objetos').select('*').eq('id', objetoId).maybeSingle()) as Objeto | null
  }, [objetoId])

  useEffect(() => {
    const o = objeto.dados
    if (!o) return
    setForm({
      codigo: o.codigo ?? '', nome: o.nome, descricao: o.descricao ?? '', historia: o.historia ?? '',
      procedencia: o.procedencia ?? '', ano_origem: o.ano_origem ?? '', material: o.material ?? '', dimensoes: o.dimensoes ?? '',
      categoria_id: o.categoria_id ? String(o.categoria_id) : '', estado_conservacao_id: o.estado_conservacao_id ? String(o.estado_conservacao_id) : '',
      valor_estimado: valorParaTexto(o.valor_estimado), valor_venda: valorParaTexto(o.valor_venda),
      situacao: o.situacao, publico: o.publico, observacoes_internas: o.observacoes_internas ?? '',
    })
  }, [objeto.dados])

  const campo = <K extends keyof Form>(k: K) => ({
    value: form[k] as string,
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setAviso('')
    if (!form.nome.trim()) return setErro('Informe o nome da peça.')
    const valorEstimado = lerValor(form.valor_estimado)
    const valorVenda = lerValor(form.valor_venda)
    if (form.valor_estimado.trim() && valorEstimado == null) return setErro('Valor estimado inválido. Use, por exemplo, 1.250,00')
    if (form.valor_venda.trim() && valorVenda == null) return setErro('Valor de venda inválido. Use, por exemplo, 1.250,00')
    const t = (s: string) => s.trim() || null
    const dados = {
      codigo: t(form.codigo), nome: form.nome.trim(), descricao: t(form.descricao), historia: t(form.historia),
      procedencia: t(form.procedencia), ano_origem: t(form.ano_origem), material: t(form.material), dimensoes: t(form.dimensoes),
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      estado_conservacao_id: form.estado_conservacao_id ? Number(form.estado_conservacao_id) : null,
      valor_estimado: valorEstimado, valor_venda: valorVenda, situacao: form.situacao, publico: form.publico,
      observacoes_internas: t(form.observacoes_internas),
    }
    setSalvando(true)
    if (nova) {
      const { data, error } = await supabase.from('objetos').insert({ ...dados, criado_por: sessao?.user.id }).select('id').single()
      setSalvando(false)
      if (error) return setErro(mensagemErro(error))
      navegar(`/admin/pecas/${data.id}?criada=1`, true)
    } else {
      const { error } = await supabase.from('objetos').update({ ...dados, atualizado_por: sessao?.user.id }).eq('id', objetoId!)
      setSalvando(false)
      if (error) return setErro(mensagemErro(error))
      setAviso('Alterações salvas.')
    }
  }

  async function excluir() {
    if (!confirm(`Excluir "${form.nome}" e todas as suas fotos? Esta ação não pode ser desfeita.`)) return
    setErro('')
    const { data: imgs } = await supabase.from('imagens_objetos').select('caminho_storage').eq('objeto_id', objetoId!)
    const { error } = await supabase.from('objetos').delete().eq('id', objetoId!)
    if (error) {
      return setErro(
        error.code === '23503'
          ? 'Esta peça tem interesses registrados e não pode ser excluída. Para tirá-la do site, desmarque “Mostrar no site”.'
          : mensagemErro(error),
      )
    }
    const caminhos = (imgs ?? []).flatMap((i) => [i.caminho_storage, caminhoMiniatura(i.caminho_storage)])
    if (caminhos.length) await supabase.storage.from(BUCKET_OBJETOS).remove(caminhos)
    navegar('/admin/pecas', true)
  }

  if (objeto.carregando || apoio.carregando) return <p className="carregando">Carregando…</p>
  if (objeto.erro || apoio.erro) return <Mensagem tipo="erro">{mensagemErro(objeto.erro || apoio.erro)}</Mensagem>
  if (!nova && !objeto.dados) return <div className="vazio"><p>Peça não encontrada.</p><Link href="/admin/pecas" className="botao">Voltar</Link></div>

  return (
    <>
      <Link href="/admin/pecas" className="voltar" style={{ marginTop: 0, marginBottom: 12 }}>← Peças</Link>
      <div className="adm-topo">
        <h1>{nova ? 'Nova peça' : form.nome || 'Peça'}</h1>
        {!nova && objeto.dados && (
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="etiqueta">{identificacao(objeto.dados)}</span>
            {objeto.dados.publico && <a href={`/peca/${objetoId}`} target="_blank" rel="noopener">Ver no site</a>}
          </span>
        )}
      </div>

      {recemCriada && <div style={{ marginBottom: 16 }}><Mensagem tipo="ok">Peça cadastrada. Agora adicione as fotos.</Mensagem></div>}
      {!nova && <Fotos objetoId={objetoId!} nomePeca={form.nome} />}

      <form onSubmit={salvar}>
        <section className="adm-bloco">
          <h2>Identificação</h2>
          <div className="campos campos--2">
            <div className="campo campo--largo">
              <label htmlFor="p-nome">Nome da peça</label>
              <input id="p-nome" type="text" {...campo('nome')} required maxLength={200} />
            </div>
            <div className="campo">
              <label htmlFor="p-codigo">Código da etiqueta</label>
              <input id="p-codigo" type="text" {...campo('codigo')} placeholder="Ex.: REL-0001" />
              <span className="ajuda">Opcional. Se vazio, o site mostra o número interno.</span>
            </div>
            <div className="campo">
              <label htmlFor="p-cat">Categoria</label>
              <select id="p-cat" {...campo('categoria_id')}>
                <option value="">Sem categoria</option>
                {apoio.dados?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.ativo ? '' : ' (inativa)'}</option>)}
              </select>
              {apoio.dados?.categorias.length === 0 && <span className="ajuda">Nenhuma categoria ainda. <Link href="/admin/categorias">Cadastrar categorias</Link></span>}
            </div>
            <div className="campo campo--largo">
              <label htmlFor="p-desc">Descrição curta</label>
              <textarea id="p-desc" {...campo('descricao')} placeholder="O que é a peça, em poucas linhas." />
            </div>
          </div>
        </section>

        <section className="adm-bloco">
          <h2>Ficha técnica</h2>
          <div className="campos campos--2">
            <div className="campo">
              <label htmlFor="p-ano">Época</label>
              <input id="p-ano" type="text" {...campo('ano_origem')} placeholder="Ex.: c. 1920, década de 1950" />
            </div>
            <div className="campo">
              <label htmlFor="p-est">Estado de conservação</label>
              <select id="p-est" {...campo('estado_conservacao_id')}>
                <option value="">Não informado</option>
                {apoio.dados?.estados.map((s) => <option key={s.id} value={s.id}>{s.descricao}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="p-mat">Material</label>
              <input id="p-mat" type="text" {...campo('material')} placeholder="Ex.: prata, jacarandá" />
            </div>
            <div className="campo">
              <label htmlFor="p-dim">Dimensões</label>
              <input id="p-dim" type="text" {...campo('dimensoes')} placeholder="Ex.: 30 × 20 × 15 cm" />
            </div>
            <div className="campo campo--largo">
              <label htmlFor="p-proc">Procedência</label>
              <input id="p-proc" type="text" {...campo('procedencia')} placeholder="De quem veio e como chegou à família" />
            </div>
          </div>
        </section>

        <section className="adm-bloco">
          <h2>História</h2>
          <div className="campo">
            <label htmlFor="p-hist" className="pular">História da peça</label>
            <textarea id="p-hist" className="longo" {...campo('historia')} placeholder="Conte a história da peça: quem a usou, em que ocasiões, por onde passou." />
          </div>
        </section>

        <section className="adm-bloco">
          <h2>Venda e visibilidade</h2>
          <div className="campos campos--2">
            <div className="campo">
              <label htmlFor="p-sit">Situação</label>
              <select id="p-sit" {...campo('situacao')}>
                {Object.entries(ROTULO_SITUACAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
              <span className="ajuda">Só peças “À venda” exibem o botão “Tenho interesse”.</span>
            </div>
            <div className="campo" style={{ alignContent: 'center' }}>
              <label className="check">
                <input type="checkbox" checked={form.publico} onChange={(e) => setForm((f) => ({ ...f, publico: e.target.checked }))} />
                Mostrar no site
              </label>
            </div>
            <div className="campo">
              <label htmlFor="p-vv">Valor de venda (R$)</label>
              <input id="p-vv" type="text" inputMode="decimal" {...campo('valor_venda')} placeholder="0,00" />
              <span className="ajuda">Aparece no site quando a peça está à venda.</span>
            </div>
            <div className="campo">
              <label htmlFor="p-ve">Valor estimado (R$)</label>
              <input id="p-ve" type="text" inputMode="decimal" {...campo('valor_estimado')} placeholder="0,00" />
              <span className="ajuda">Uso interno. Nunca aparece no site.</span>
            </div>
            <div className="campo campo--largo">
              <label htmlFor="p-obs">Observações internas</label>
              <textarea id="p-obs" {...campo('observacoes_internas')} placeholder="Anotações da família. Nunca aparecem no site." />
            </div>
          </div>
        </section>

        <Mensagem tipo="erro">{erro}</Mensagem>
        <Mensagem tipo="ok">{aviso}</Mensagem>
        <div className="barra-acoes">
          <button className="botao" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : nova ? 'Cadastrar e adicionar fotos' : 'Salvar alterações'}</button>
          <Link href="/admin/pecas" className="botao botao--claro">Cancelar</Link>
          {!nova && <button type="button" className="botao botao--perigo direita" onClick={excluir}>Excluir peça</button>}
        </div>
      </form>
    </>
  )
}

/* ---------------------------------------------------------------- Fotos */

function Fotos({ objetoId, nomePeca }: { objetoId: number; nomePeca: string }) {
  const { dados, erro, recarregar } = useConsulta(
    async () => (ok(await supabase.from('imagens_objetos').select('*').eq('objeto_id', objetoId).order('ordem').order('id')) ?? []) as Imagem[],
    [objetoId],
  )
  const [progresso, setProgresso] = useState('')
  const [falha, setFalha] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const fotos = dados ?? []

  async function enviar(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos).filter((a) => a.type.startsWith('image/'))
    if (!lista.length) return
    setFalha('')
    let ordem = fotos.reduce((m, f) => Math.max(m, f.ordem), -1)
    let temPrincipal = fotos.some((f) => f.principal)
    const erros: string[] = []
    for (let i = 0; i < lista.length; i++) {
      const arq = lista[i]
      setProgresso(`Enviando foto ${i + 1} de ${lista.length}…`)
      try {
        const { grande, miniatura } = await prepararFoto(arq)
        const ext = grande.type === 'image/webp' ? 'webp' : 'jpg'
        const caminho = `${objetoId}/${crypto.randomUUID()}.${ext}`
        const s = supabase.storage.from(BUCKET_OBJETOS)
        const up1 = await s.upload(caminho, grande, { contentType: grande.type, cacheControl: '31536000' })
        if (up1.error) throw up1.error
        const up2 = await s.upload(caminhoMiniatura(caminho), miniatura, { contentType: miniatura.type, cacheControl: '31536000' })
        if (up2.error) throw up2.error
        const { error } = await supabase.from('imagens_objetos').insert({ objeto_id: objetoId, caminho_storage: caminho, ordem: ++ordem, principal: !temPrincipal })
        if (error) {
          await s.remove([caminho, caminhoMiniatura(caminho)])
          throw error
        }
        temPrincipal = true
      } catch (e) {
        erros.push(`${arq.name}: ${e instanceof Error ? e.message : mensagemErro(e)}`)
      }
    }
    setProgresso('')
    if (erros.length) setFalha('Não foi possível enviar: ' + erros.join(' · '))
    if (entrada.current) entrada.current.value = ''
    recarregar()
  }

  async function tornarPrincipal(f: Imagem) {
    const r1 = await supabase.from('imagens_objetos').update({ principal: false }).eq('objeto_id', objetoId).eq('principal', true)
    if (r1.error) return setFalha(mensagemErro(r1.error))
    const r2 = await supabase.from('imagens_objetos').update({ principal: true }).eq('id', f.id)
    if (r2.error) setFalha(mensagemErro(r2.error))
    recarregar()
  }

  async function mover(i: number, delta: -1 | 1) {
    const a = fotos[i]
    const b = fotos[i + delta]
    if (!a || !b) return
    const ordemA = a.ordem === b.ordem ? i : a.ordem
    const ordemB = a.ordem === b.ordem ? i + delta : b.ordem
    await Promise.all([
      supabase.from('imagens_objetos').update({ ordem: ordemB }).eq('id', a.id),
      supabase.from('imagens_objetos').update({ ordem: ordemA }).eq('id', b.id),
    ])
    recarregar()
  }

  async function salvarLegenda(f: Imagem, legenda: string) {
    const v = legenda.trim() || null
    if (v === f.legenda) return
    const { error } = await supabase.from('imagens_objetos').update({ legenda: v }).eq('id', f.id)
    if (error) setFalha(mensagemErro(error))
  }

  async function excluir(f: Imagem) {
    if (!confirm('Excluir esta foto?')) return
    const { error } = await supabase.from('imagens_objetos').delete().eq('id', f.id)
    if (error) return setFalha(mensagemErro(error))
    await supabase.storage.from(BUCKET_OBJETOS).remove([f.caminho_storage, caminhoMiniatura(f.caminho_storage)])
    const restantes = fotos.filter((x) => x.id !== f.id)
    if (f.principal && restantes[0]) await supabase.from('imagens_objetos').update({ principal: true }).eq('id', restantes[0].id)
    recarregar()
  }

  function soltar(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    if (!progresso) enviar(e.dataTransfer.files)
  }

  return (
    <section className="adm-bloco">
      <h2>Fotos</h2>
      <label
        className={`enviar-fotos${arrastando ? ' arrastando' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        <input ref={entrada} type="file" accept="image/*" multiple disabled={!!progresso} onChange={(e) => e.target.files && enviar(e.target.files)} />
        <strong>{progresso || 'Clique para escolher fotos ou arraste-as para cá'}</strong>
        <span style={{ fontSize: '0.85rem' }}>As fotos são reduzidas automaticamente antes do envio.</span>
      </label>
      <Mensagem tipo="erro">{falha || (erro ? mensagemErro(erro) : '')}</Mensagem>
      {fotos.length > 0 && (
        <div className="fotos-adm">
          {fotos.map((f, i) => (
            <div key={f.id} className={`foto-adm${f.principal ? ' principal' : ''}`}>
              <Foto src={urlFoto(f.caminho_storage, true)} alt={f.legenda || `${nomePeca} — foto ${i + 1}`} />
              <div className="corpo">
                <input type="text" aria-label={`Legenda da foto ${i + 1}`} placeholder="Legenda (opcional)" defaultValue={f.legenda ?? ''} onBlur={(e) => salvarLegenda(f, e.target.value)} />
                <div className="botoes">
                  <button type="button" className="botao botao--claro botao--pequeno" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>
                  <button type="button" className="botao botao--claro botao--pequeno" onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover para a direita">→</button>
                  <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => excluir(f)}>Excluir</button>
                </div>
                {f.principal ? (
                  <span className="selo selo--A_VENDA" style={{ justifySelf: 'start' }}>Foto de capa</span>
                ) : (
                  <button type="button" className="botao botao--claro botao--pequeno" onClick={() => tornarPrincipal(f)}>Usar como capa</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
