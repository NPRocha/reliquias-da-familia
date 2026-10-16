import { useState, type FormEvent } from 'react'
import { COLUNAS_CATALOGO } from '../components/CartaoPeca'
import { Carimbo, Etiqueta, Foto, Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { formatarTelefone, formatarValor, identificacao, soDigitos } from '../lib/formato'
import { Link } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'
import type { Imagem, ObjetoCatalogo } from '../lib/tipos'

export function Peca({ id }: { id: string }) {
  const { config } = useConfig()
  const vendas = config.vendas_ativas
  const { dados, erro, carregando } = useConsulta(async () => {
    const peca = ok(await supabase.from('catalogo').select(COLUNAS_CATALOGO).eq('id', Number(id)).maybeSingle()) as ObjetoCatalogo | null
    if (!peca) return null
    const [fotos, cat, est] = await Promise.all([
      supabase.from('imagens_objetos').select('id,objeto_id,caminho_storage,legenda,ordem,principal').eq('objeto_id', peca.id),
      peca.categoria_id ? supabase.from('categorias').select('nome').eq('id', peca.categoria_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      peca.estado_conservacao_id
        ? supabase.from('estados_conservacao').select('descricao').eq('id', peca.estado_conservacao_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    return {
      peca,
      fotos: ((ok(fotos) ?? []) as Imagem[]).sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem),
      categoria: (ok(cat) as { nome: string } | null)?.nome ?? null,
      conservacao: (ok(est) as { descricao: string } | null)?.descricao ?? null,
    }
  }, [id, vendas])
  const [atual, setAtual] = useState(0)
  useTitulo(dados?.peca.nome ?? 'Peça')

  if (carregando) return <p className="carregando">Abrindo a ficha…</p>
  if (erro) return <div className="secao"><Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem></div>
  if (!dados) {
    return (
      <div className="vazio">
        <p>Esta peça não está disponível para visualização.</p>
        <Link href="/acervo" className="botao">{vendas ? 'Ver peças disponíveis' : 'Voltar ao acervo'}</Link>
      </div>
    )
  }

  const { peca, fotos } = dados
  const foto = fotos[Math.min(atual, fotos.length - 1)]
  const ficha: [string, string | null | undefined][] = [
    ['Época', peca.ano_origem],
    ['Material', peca.material],
    ['Dimensões', peca.dimensoes],
    ['Conservação', dados.conservacao],
    ['Categoria', dados.categoria],
    ['Procedência', peca.procedencia],
    ['Valor estimado', peca.valor_estimado != null ? formatarValor(peca.valor_estimado) : null],
  ]
  const aVenda = vendas && peca.situacao === 'A_VENDA'

  return (
    <>
      <Link href="/acervo" className="voltar">← {vendas ? 'Peças disponíveis' : 'Voltar ao acervo'}</Link>
      <article className="peca">
        <div className="galeria">
          <Foto className="principal" caminho={foto?.caminho_storage} alt={foto?.legenda || peca.nome} />
          {foto?.legenda && <p className="legenda">{foto.legenda}</p>}
          {fotos.length > 1 && (
            <div className="miniaturas" role="group" aria-label="Fotos da peça">
              {fotos.map((f, i) => (
                <button key={f.id} type="button" aria-current={i === atual} aria-label={`Foto ${i + 1} de ${fotos.length}`} onClick={() => setAtual(i)}>
                  <Foto caminho={f.caminho_storage} miniatura alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="peca-cabeca">
            <Etiqueta texto={identificacao(peca)} grande />
            <h1>{peca.nome}</h1>
            {vendas && <Carimbo situacao={peca.situacao} grande />}
            {aVenda && peca.valor_venda != null && <p className="peca-valor">{formatarValor(peca.valor_venda)}</p>}
          </div>
          {peca.descricao && <p className="peca-resumo" style={{ marginTop: 20 }}>{peca.descricao}</p>}

          <dl className="ficha">
            {ficha.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {aVenda && <FormInteresse peca={peca} />}
        </div>
      </article>

      {peca.historia && (
        <section className="historia" aria-labelledby="t-historia">
          <h2 id="t-historia">A história</h2>
          <div className="corpo">{peca.historia}</div>
        </section>
      )}
    </>
  )
}

function FormInteresse({ peca }: { peca: ObjetoCatalogo }) {
  const { perfil } = useAuth()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [fone, setFone] = useState(formatarTelefone(perfil?.whatsapp))
  const [email, setEmail] = useState(perfil?.email ?? '')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    let digitos = soDigitos(fone)
    if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2)
    if (nome.trim().length < 2) return setErro('Informe seu nome.')
    if (digitos.length < 10 || digitos.length > 11) return setErro('Informe o WhatsApp com DDD, por exemplo (85) 99999-0000.')
    setEnviando(true)
    const { error } = await supabase.from('interesses').insert({
      objeto_id: peca.id,
      nome: nome.trim(),
      whatsapp: digitos,
      email: email.trim() || null,
      mensagem: mensagem.trim() || null,
    })
    setEnviando(false)
    if (error) {
      return setErro(error.code === '42501' ? 'Esta peça não está mais disponível para interesse.' : mensagemErro(error))
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="painel-form" role="status">
        <h2>Interesse registrado</h2>
        <p style={{ margin: 0 }}>Obrigado, {nome.trim().split(' ')[0]}. A família vai entrar em contato pelo WhatsApp informado.</p>
      </div>
    )
  }

  return (
    <form className="painel-form" onSubmit={enviar} noValidate>
      <h2>Tenho interesse</h2>
      <p>{perfil ? 'Confira seus dados e, se quiser, deixe uma mensagem.' : 'Deixe seu nome e WhatsApp.'} A família entra em contato com você.</p>
      <div className="campos">
        <div className="campo">
          <label htmlFor="i-nome">Nome</label>
          <input id="i-nome" type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
        </div>
        <div className="campo">
          <label htmlFor="i-fone">WhatsApp com DDD</label>
          <input id="i-fone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(85) 99999-0000" value={fone} onChange={(e) => setFone(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="i-email">E-mail <span className="ajuda">(opcional)</span></label>
          <input id="i-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="i-msg">Mensagem <span className="ajuda">(opcional)</span></label>
          <textarea id="i-msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={1000} placeholder="Alguma pergunta sobre a peça?" />
        </div>
        <Mensagem tipo="erro">{erro}</Mensagem>
        <div>
          <button className="botao" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Registrar interesse'}</button>
        </div>
      </div>
    </form>
  )
}
